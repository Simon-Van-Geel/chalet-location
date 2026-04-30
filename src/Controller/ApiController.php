<?php

namespace App\Controller;

use App\Repository\BookingRepository;
use App\Repository\FloorRepository;
use App\Repository\ImageRepository;
use App\Repository\SeasonRepository;
use App\Repository\ContactRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;
use App\Entity\Booking;
use App\Entity\BookingItem;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\Request;
use \DateTime;
use Symfony\Component\Security\Http\Attribute\IsGranted;
use Stripe\Stripe;
use Stripe\Checkout\Session;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Bridge\Twig\Mime\TemplatedEmail;
use Symfony\Component\Mime\Address;

#[Route('/api', name: 'api_')]
class ApiController extends AbstractController
{
    #[Route('/calendrier', name: 'calendrier', methods: ['GET'])]
    public function getDonneesCalendrier(FloorRepository $floorRepo, BookingRepository $bookingRepo): JsonResponse
    {
        $floors = $floorRepo->findAll();
        $bookings = $bookingRepo->findAll();

        $floorsData = [];
        foreach ($floors as $floor) {
            $floorsData[] = [
                'id' => $floor->getId(),
                'name' => $floor->getName(),
                'basePrice' => $floor->getBasePrice(),
            ];
        }

        $bookingsData = [];
        foreach ($bookings as $booking) {
            // NOUVEAU : On ne bloque le calendrier que si l'acompte est payé ou le séjour confirmé
            if (in_array($booking->getStatus(), ['ACOMPTE_PAYE', 'CONFIRMEE'])) {
                $bookedFloors = [];
                foreach ($booking->getBookingItems() as $item) {
                    $bookedFloors[] = $item->getFloor()->getId();
                }

                $bookingsData[] = [
                    'id' => $booking->getId(),
                    'startDate' => $booking->getStartDate()->format('Y-m-d'),
                    'endDate' => $booking->getEndDate()->format('Y-m-d'),
                    'floors' => $bookedFloors,
                ];
            }
        }

        return $this->json([
            'floors' => $floorsData,
            'bookings' => $bookingsData,
        ]);
    }

    // NOUVELLE ROUTE : Pour envoyer les saisons à Vue.js
    #[Route('/saisons', name: 'saisons', methods: ['GET'])]
    public function getSeasons(SeasonRepository $seasonRepo): JsonResponse
    {
        $seasons = $seasonRepo->findAll();
        $data = [];

        foreach ($seasons as $season) {
            $data[] = [
                'id' => $season->getId(),
                'name' => $season->getName(),
                'startDate' => $season->getStartDate()->format('Y-m-d'),
                'endDate' => $season->getEndDate()->format('Y-m-d'),
                'seasonPrice' => $season->getSeasonPrice(), // Le multiplicateur (ex: 1.2)
            ];
        }

        return $this->json($data);
    }

    #[Route('/reserver', name: 'reserver', methods: ['POST'])]
    public function reserver(Request $request, EntityManagerInterface $em, FloorRepository $floorRepo, SeasonRepository $seasonRepo, MailerInterface $mailer): JsonResponse {
        $user = $this->getUser();
        if (!$user) {
            return $this->json(['error' => 'Vous devez être connecté pour réserver.'], 403);
        }

        $data = json_decode($request->getContent(), true);

        // On vérifie qu'on reçoit bien "floors" (le tableau) au lieu de "floorId"
        if (!isset($data['startDate'], $data['endDate'], $data['floors'])) {
            return $this->json(['error' => 'Données incomplètes.'], 400);
        }

        $startDate = new DateTime($data['startDate']);
        $endDate = new DateTime($data['endDate']);

        // --- DÉBUT DU CALCUL DE SÉCURITÉ CÔTÉ SERVEUR ---
        $calculatedTotalPrice = 0;
        $seasons = $seasonRepo->findAll();
        $currentDate = clone $startDate;

        // Boucle sur chaque nuit
        while ($currentDate < $endDate) {
            $modifier = 1.0;

            // Cherche si la nuit tombe dans une saison
            foreach ($seasons as $season) {
                if ($currentDate >= $season->getStartDate() && $currentDate <= $season->getEndDate()) {
                    $modifier = $season->getSeasonPrice();
                    break;
                }
            }

            // Ajoute le prix de chaque étage sélectionné pour cette nuit
            foreach ($data['floors'] as $floorId) {
                $floor = $floorRepo->find($floorId);
                if ($floor) {
                    $calculatedTotalPrice += ($floor->getBasePrice() * $modifier);
                }
            }

            $currentDate->modify('+1 day');
        }
        // --- FIN DU CALCUL DE SÉCURITÉ ---

        // Créer la réservation principale
        $booking = new Booking();
        $booking->setUser($user);
        $booking->setStartDate($startDate);
        $booking->setEndDate($endDate);
        $booking->setStatus('EN_ATTENTE');
        $booking->setCreatedAt(new DateTime());

        // On enregistre le prix calculé par le serveur, et pas celui envoyé par le Javascript !
        $booking->setTotalPrice($calculatedTotalPrice);

        // Gérer les étages choisis
        foreach ($data['floors'] as $floorId) {
            $floor = $floorRepo->find($floorId);
            if ($floor) {
                $item = new BookingItem();
                $item->setBooking($booking);
                $item->setFloor($floor);
                $item->setPriceAtBooking($floor->getBasePrice());
                $em->persist($item);
            }
        }

        $em->persist($booking);
        $em->flush();

        // --- NOUVEAU : Calcul de l'acompte (30%) ---
        $acomptePrice = $calculatedTotalPrice * 0.30;

        // --- DÉBUT : ENVOI DE L'EMAIL DE CONFIRMATION ---
        // On récupère les noms des étages pour les afficher dans l'e-mail
        $floorsNames = [];
        foreach ($data['floors'] as $floorId) {
            $floor = $floorRepo->find($floorId);
            if ($floor) {
                $floorsNames[] = $floor->getName();
            }
        }

        $email = (new TemplatedEmail())
            ->from(new Address('admin@chalet.be', 'Chalet Gérardmer'))
            ->to($user->getEmail())
            ->subject('Confirmation de votre réservation - Chalet Gérardmer')
            ->htmlTemplate('email/reservation_confirmation.html.twig')
            ->context([
                'user' => $user,
                'booking' => $booking,
                'totalPrice' => $calculatedTotalPrice,
                'floors_names' => $floorsNames,
            ]);

        $mailer->send($email);
        // --- FIN : ENVOI DE L'EMAIL ---

        // 1. Initialiser Stripe avec ta clé secrète (définie dans ton .env via services.yaml)
        Stripe::setApiKey($this->getParameter('stripe_secret_key'));

        try {
            $session = Session::create([
                'payment_method_types' => ['card'],
                'line_items' => [[
                    'price_data' => [
                        'currency' => 'eur',
                        'product_data' => [
                            // On précise bien au client qu'il paie un acompte
                            'name' => 'Acompte (30%) - Location Chalet Gérardmer',
                            'description' => 'Séjour du ' . $startDate->format('d/m/Y') . ' au ' . $endDate->format('d/m/Y'),
                        ],
                        // On envoie le prix de l'acompte en centimes (utilisation de round pour éviter les décimales)
                        'unit_amount' => (int) round($acomptePrice * 100),
                    ],
                    'quantity' => 1,
                ]],
                'mode' => 'payment',
                'client_reference_id' => $booking->getId(),

                // NOUVEAU : On glisse une information secrète pour le Webhook
                'metadata' => [
                    'type_paiement' => 'acompte'
                ],

                'success_url' => 'https://127.0.0.1:8000/mon-compte?status=success',
                'cancel_url' => 'https://127.0.0.1:8000/mon-compte?status=cancel'
            ]);

            // 3. Renvoyer l'URL de paiement Stripe à Vue.js
            return $this->json([
                'message' => 'Réservation enregistrée. Redirection vers le paiement.',
                'bookingId' => $booking->getId(),
                'url' => $session->url // L'URL magique vers laquelle Vue.js doit rediriger le client
            ], 200);

        } catch (\Exception $e) {
            // Si Stripe rencontre un problème, on le signale
            return $this->json(['error' => 'Erreur lors de la création du paiement : ' . $e->getMessage()], 500);
        }
    }

    #[Route('/reserver/{id}/payer-solde', name: 'payer_solde', methods: ['POST'])]
    #[IsGranted('ROLE_USER')]
    public function payerSolde(int $id, BookingRepository $bookingRepo): JsonResponse
    {
        $user = $this->getUser();
        $booking = $bookingRepo->find($id);

        // 1. Vérifications de sécurité
        if (!$booking || $booking->getUser() !== $user) {
            return $this->json(['error' => 'Réservation introuvable ou non autorisée.'], 403);
        }

        if ($booking->getStatus() !== 'ACOMPTE_PAYE') {
            return $this->json(['error' => 'Le solde de cette réservation ne peut pas être payé actuellement.'], 400);
        }

        // 2. Calcul des 70% restants
        $soldePrice = $booking->getTotalPrice() * 0.70;

        Stripe::setApiKey($this->getParameter('stripe_secret_key'));

        try {
            $session = Session::create([
                'payment_method_types' => ['card'],
                'line_items' => [[
                    'price_data' => [
                        'currency' => 'eur',
                        'product_data' => [
                            'name' => 'Solde (70%) - Location Chalet Gérardmer',
                            'description' => 'Finalisation de votre séjour du ' . $booking->getStartDate()->format('d/m/Y'),
                        ],
                        'unit_amount' => (int) round($soldePrice * 100),
                    ],
                    'quantity' => 1,
                ]],
                'mode' => 'payment',
                'client_reference_id' => $booking->getId(),

                // On prévient le Webhook que cette fois, c'est le solde
                'metadata' => [
                    'type_paiement' => 'solde'
                ],

                'success_url' => 'https://127.0.0.1:8000/mon-compte?status=success',
                'cancel_url' => 'https://127.0.0.1:8000/mon-compte?status=cancel'
            ]);

            return $this->json(['url' => $session->url], 200);

        } catch (\Exception $e) {
            return $this->json(['error' => 'Erreur Stripe : ' . $e->getMessage()], 500);
        }
    }

    #[Route('/mes-reservations', name: 'mes_reservations', methods: ['GET'])]
    #[IsGranted('ROLE_USER')]
    public function getMesReservations(BookingRepository $bookingRepo): JsonResponse
    {
        $user = $this->getUser();
        $bookings = $bookingRepo->findBy(['user' => $user], ['createdAt' => 'DESC']);

        $data = [];
        foreach ($bookings as $booking) {
            $floors = [];
            foreach ($booking->getBookingItems() as $item) {
                $floors[] = $item->getFloor()->getName();
            }

            $data[] = [
                'id' => $booking->getId(),
                'startDate' => $booking->getStartDate()->format('d/m/Y'),
                'endDate' => $booking->getEndDate()->format('d/m/Y'),
                'totalPrice' => $booking->getTotalPrice(),
                'status' => $booking->getStatus(),
                'floors' => $floors,
                'createdAt' => $booking->getCreatedAt()->format('d/m/Y à H:i'),
            ];
        }

        return $this->json($data);
    }

    #[Route('/admin/reservations', name: 'admin_reservations_list', methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN')]
    public function getAllReservations(BookingRepository $bookingRepo): JsonResponse
    {
        $bookings = $bookingRepo->findBy([], ['createdAt' => 'DESC']);

        $data = [];
        foreach ($bookings as $booking) {
            $floors = [];
            foreach ($booking->getBookingItems() as $item) {
                $floors[] = $item->getFloor()->getName();
            }

            $data[] = [
                'id' => $booking->getId(),
                'clientName' => $booking->getUser()->getFirstName() . ' ' . $booking->getUser()->getLastName(),
                'clientEmail' => $booking->getUser()->getEmail(),
                'startDate' => $booking->getStartDate()->format('d/m/Y'),
                'endDate' => $booking->getEndDate()->format('d/m/Y'),
                'totalPrice' => $booking->getTotalPrice(),
                'status' => $booking->getStatus(),
                'floors' => $floors,
                'createdAt' => $booking->getCreatedAt()->format('d/m/Y à H:i'),
            ];
        }

        return $this->json($data);
    }

    #[Route('/admin/reservations/{id}/status', name: 'admin_reservations_status', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN')]
    public function updateReservationStatus(int $id, Request $request, BookingRepository $bookingRepo, EntityManagerInterface $em): JsonResponse
    {
        $booking = $bookingRepo->find($id);

        if (!$booking) {
            return $this->json(['error' => 'Réservation introuvable.'], 404);
        }

        $data = json_decode($request->getContent(), true);

        if (!isset($data['status'])) {
            return $this->json(['error' => 'Statut manquant.'], 400);
        }

        $booking->setStatus($data['status']);
        $em->flush();

        return $this->json(['message' => 'Le statut a bien été mis à jour.']);
    }

    #[Route('/contact', name: 'contact', methods: ['POST'])]
    public function envoyerMessage(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        // 1. Protection Anti-Spam (Honeypot)
        // Si le champ caché 'phone_number_bot' est rempli, c'est un robot !
        if (!empty($data['phone_number_bot'])) {
            // On renvoie un faux message de succès pour tromper le robot
            return $this->json(['message' => 'Message envoyé avec succès.'], 200);
        }

        // 2. Validation des données
        if (empty($data['email']) || empty($data['subject']) || empty($data['content'])) {
            return $this->json(['error' => 'Veuillez remplir tous les champs obligatoires.'], 400);
        }

        if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            return $this->json(['error' => 'Adresse email invalide.'], 400);
        }

        // 3. Création et sauvegarde de l'entité Contact
        $contact = new \App\Entity\Contact();
        $contact->setSenderEmail($data['email']);
        $contact->setSubject($data['subject']);
        $contact->setContent($data['content']);
        $contact->setCreatedAt(new \DateTimeImmutable());
        $contact->setIsRead(false); // Par défaut, le message n'est pas lu

        $em->persist($contact);
        $em->flush();

        // (Optionnel) C'est ici que tu pourras ajouter Symfony Mailer plus tard
        // pour t'envoyer une notification par email.

        return $this->json(['message' => 'Votre message a bien été envoyé. Nous vous répondrons rapidement !'], 200);
    }

    #[Route('/admin/contacts', name: 'admin_contacts_list', methods: ['GET'])]
    #[IsGranted('ROLE_ADMIN')]
    public function getMessagesContact(ContactRepository $contactRepo): JsonResponse
    {
        // On récupère tous les messages de la base de données, du plus récent au plus ancien
        $messages = $contactRepo->findBy([], ['createdAt' => 'DESC']);

        $data = [];
        foreach ($messages as $msg) {
            $data[] = [
                'id' => $msg->getId(),
                'email' => $msg->getSenderEmail(),
                'subject' => $msg->getSubject(),
                'content' => $msg->getContent(),
                'createdAt' => $msg->getCreatedAt()->format('d/m/Y à H:i'),
                'isRead' => $msg->isRead(),
            ];
        }

        return $this->json($data);
    }

    #[Route('/admin/contacts/{id}/read', name: 'admin_contact_mark_read', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN')]
    public function markAsRead(int $id, ContactRepository $contactRepo, EntityManagerInterface $em): JsonResponse
    {
        $message = $contactRepo->find($id);

        if (!$message) {
            return $this->json(['error' => 'Message introuvable.'], 404);
        }

        $message->setIsRead(true);
        $em->flush();

        return $this->json(['message' => 'Message marqué comme lu.']);
    }

    #[Route('/admin/gallery/upload', name: 'admin_gallery_upload', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN')]
    public function uploadImage(Request $request, EntityManagerInterface $em, FloorRepository $floorRepo): JsonResponse
    {
        // 1. On récupère les données envoyées par le Front-end (Vue.js)
        $file = $request->files->get('photo');
        $altText = $request->request->get('altText', '');
        $floorId = $request->request->get('floorId'); // NOUVEAU : On récupère l'ID de l'étage

        if (!$file) {
            return $this->json([
                'error' => 'Aucun fichier détecté.',
                'limite_upload' => ini_get('upload_max_filesize'),
                'limite_post' => ini_get('post_max_size')
            ], 400);
        }

        // --- NOUVEAU : GESTION DE L'ÉTAGE ET TEXTE PAR DÉFAUT ---
        $floor = null;
        if ($floorId) {
            $floor = $floorRepo->find($floorId);

            // Si l'admin n'a pas tapé de texte, on en génère un joli par défaut basé sur l'étage
            if (empty(trim($altText)) && $floor) {
                if ($floor->getName() === 'Rez-de-chaussée') {
                    $altText = "Magnifique vue du Rez-de-chaussée du chalet";
                } elseif ($floor->getName() === '1er Étage') {
                    $altText = "Ambiance chaleureuse au 1er étage du chalet";
                } else {
                    $altText = "Photo de l'espace : " . $floor->getName();
                }
            }
        }

        // Si le champ est toujours vide (et qu'aucun étage n'est sélectionné), on met un fallback global
        if (empty(trim($altText))) {
            $altText = "Photo du chalet Gérardmer";
        }
        // --------------------------------------------------------

        // 2. On génère un nom de fichier unique
        $newFilename = uniqid() . '.' . $file->guessExtension();

        try {
            // 3. On déplace physiquement le fichier
            $file->move(
                $this->getParameter('gallery_directory'),
                $newFilename
            );
        } catch (\Exception $e) {
            return $this->json(['error' => 'Erreur lors de la sauvegarde du fichier.'], 500);
        }

        // 4. On crée l'entité pour la base de données
        $image = new \App\Entity\Image();
        $image->setFileName($newFilename);
        $image->setAltText($altText);
        $image->setPosition(0);

        // NOUVEAU : On lie l'image à l'étage s'il a été trouvé
        if ($floor) {
            $image->setFloor($floor);
        }

        $em->persist($image);
        $em->flush();

        return $this->json([
            'message' => 'Photo ajoutée à la galerie avec succès !',
            'image' => [
                'id' => $image->getId(),
                'fileName' => $newFilename,
                'altText' => $altText,
                'floor' => $floor ? $floor->getName() : null
            ]
        ], 200);
    }

    #[Route('/gallery', name: 'api_gallery_list', methods: ['GET'])]
    public function getGalleryImages(ImageRepository $imageRepo): JsonResponse
    {
        // On récupère les images triées par leur position
        $images = $imageRepo->findBy([], ['position' => 'ASC']);

        $data = [];
        foreach ($images as $image) {
            $data[] = [
                'id' => $image->getId(),
                'fileName' => $image->getFileName(),
                'altText' => $image->getAltText(),
                'url' => '/uploads/gallery/' . $image->getFileName() // L'URL publique pour afficher l'image
            ];
        }

        return $this->json($data);
    }

    #[Route('/admin/gallery/{id}', name: 'admin_gallery_delete', methods: ['DELETE'])]
    #[IsGranted('ROLE_ADMIN')]
    public function deleteImage(int $id, ImageRepository $imageRepo, EntityManagerInterface $em): JsonResponse
    {
        $image = $imageRepo->find($id);

        if (!$image) {
            return $this->json(['error' => 'Image introuvable.'], 404);
        }

        // 1. On construit le chemin absolu vers le fichier physique
        $filePath = $this->getParameter('gallery_directory') . '/' . $image->getFileName();

        // 2. Si le fichier existe physiquement sur le disque, on l'efface
        if (file_exists($filePath)) {
            unlink($filePath);
        }

        // 3. On efface la ligne dans la base de données
        $em->remove($image);
        $em->flush();

        return $this->json(['message' => 'Image supprimée avec succès.']);
    }
}
