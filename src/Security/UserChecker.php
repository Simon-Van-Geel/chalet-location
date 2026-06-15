<?php

namespace App\Security;

use App\Entity\User;
use Symfony\Component\Security\Core\Exception\CustomUserMessageAccountStatusException;
use Symfony\Component\Security\Core\User\UserCheckerInterface;
use Symfony\Component\Security\Core\User\UserInterface;

class UserChecker implements UserCheckerInterface
{
    public function checkPreAuth(UserInterface $user): void
    {
        if (!$user instanceof User) {
            return;
        }

        // 1. Si c'est un administrateur, on le laisse passer d'office !
        if (in_array('ROLE_ADMIN', $user->getRoles())) {
            return;
        }

        // 2. Si l'utilisateur n'a pas vérifié son email
        // (Attention : vérifie si ta méthode s'appelle isEmailAuthenticated() ou isIsEmailAuthenticated())
        if (!$user->isEmailAuthenticated()) {
            throw new CustomUserMessageAccountStatusException('Veuillez valider votre adresse email via le lien envoyé sur votre boîte mail avant de vous connecter.');
        }

        // Bonus : On en profite pour vérifier s'il n'a pas été banni par l'admin !
        if (method_exists($user, 'isActive') && !$user->isActive()) {
            throw new CustomUserMessageAccountStatusException('Votre compte a été désactivé par un administrateur.');
        }
    }

    public function checkPostAuth(UserInterface $user): void
    {
        // Cette méthode est obligatoire pour l'interface, mais on n'a rien à y mettre.
    }
}
