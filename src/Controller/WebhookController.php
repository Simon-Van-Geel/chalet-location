<?php

namespace App\Controller;

use App\Entity\Payment;
use App\Repository\BookingRepository;
use Doctrine\ORM\EntityManagerInterface;
use Stripe\Exception\SignatureVerificationException;
use Stripe\Webhook;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class WebhookController extends AbstractController
{
    #[Route('/api/webhook/stripe', name: 'api_stripe_webhook', methods: ['POST'])]
    public function stripeWebhook(Request $request, EntityManagerInterface $em, BookingRepository $bookingRepo): Response
    {
        $payload = $request->getContent();
        $sigHeader = $request->headers->get('stripe-signature');
        $endpointSecret = $this->getParameter('stripe_webhook_secret');

        $event = null;

        try {
            $event = Webhook::constructEvent($payload, $sigHeader, $endpointSecret);
        } catch (\UnexpectedValueException $e) {
            return new Response('Erreur de payload', 400);
        } catch (SignatureVerificationException $e) {
            return new Response('Erreur de signature', 400);
        }

        if ($event->type === 'checkout.session.completed') {
            $session = $event->data->object;
            $bookingId = $session->client_reference_id;

            // NOUVEAU : On lit la "metadata" qu'on a envoyée depuis l'ApiController
            $typePaiement = $session->metadata->type_paiement ?? 'totalite';

            if ($bookingId) {
                $booking = $bookingRepo->find($bookingId);

                if ($booking) {

                    // NOUVEAU : On change le statut selon si c'est l'acompte ou le solde final
                    if ($typePaiement === 'acompte' && $booking->getStatus() === 'EN_ATTENTE') {
                        $booking->setStatus('ACOMPTE_PAYE');
                    } elseif ($typePaiement === 'solde' && $booking->getStatus() === 'ACOMPTE_PAYE') {
                        $booking->setStatus('CONFIRMEE');
                    }

                    // On enregistre la transaction dans la table payment
                    $payment = new Payment();
                    $payment->setBooking($booking);
                    $payment->setAmount($session->amount_total / 100);
                    $payment->setPaymentMethod('Stripe (CB)');
                    $payment->setStatus('SUCCESS');

                    // Utilise DateTimeImmutable si c'est ce que Doctrine attend dans ton entité
                    $payment->setCreatedAt(new \DateTimeImmutable());

                    $em->persist($payment);
                    $em->flush();
                }
            }
        }

        return new Response('Webhook traité avec succès', 200);
    }
}
