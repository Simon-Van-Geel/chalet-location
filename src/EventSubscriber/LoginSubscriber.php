<?php


namespace App\EventSubscriber;

use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\Security\Http\Event\LoginSuccessEvent;

class LoginSubscriber implements EventSubscriberInterface
{
    private EntityManagerInterface $em;

    public function __construct(EntityManagerInterface $em)
    {
        $this->em = $em;
    }

    public static function getSubscribedEvents(): array
    {
        return [
            LoginSuccessEvent::class => 'onLoginSuccess',
        ];
    }

    public function onLoginSuccess(LoginSuccessEvent $event): void
    {
        // On récupère l'utilisateur qui vient de se connecter
        $user = $event->getUser();

        if ($user instanceof \App\Entity\User) {
            // Mettre à jour la date de dernière connexion
            $user->setLastLogAt(new \DateTime());

            // Sauvegarder en BDD
            $this->em->flush();
        }
    }
}
