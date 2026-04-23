<?php

namespace App\Controller;

use App\Repository\BookingRepository;
use App\Repository\FloorRepository;
use App\Repository\SeasonRepository;
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
            if ($booking->getStatus() !== 'ANNULEE') {
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
    public function reserver(Request $request, EntityManagerInterface $em, FloorRepository $floorRepo, SeasonRepository $seasonRepo): JsonResponse {
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

        // 1. Initialiser Stripe avec ta clé secrète (définie dans ton .env via services.yaml)
        Stripe::setApiKey($this->getParameter('stripe_secret_key'));

        try {
            // 2. Créer la session de paiement Checkout
            $session = Session::create([
                'payment_method_types' => ['card'],
                'line_items' => [[
                    'price_data' => [
                        'currency' => 'eur',
                        'product_data' => [
                            'name' => 'Location Chalet Gérardmer',
                            'description' => 'Séjour du ' . $startDate->format('d/m/Y') . ' au ' . $endDate->format('d/m/Y'),
                        ],
                        // On utilise TON prix calculé par le serveur ! (Stripe attend des centimes)
                        'unit_amount' => (int) ($calculatedTotalPrice * 100),
                    ],
                    'quantity' => 1,
                ]],
                'mode' => 'payment',
                // ASTUCE CLÉ : On passe l'ID de la réservation à Stripe.
                // Il nous le renverra lors de la validation en arrière-plan (Webhook)
                'client_reference_id' => $booking->getId(),

                // URL de redirection pour le Front-End Vue.js
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
}
