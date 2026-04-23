<?php

namespace App\DataFixtures;

use App\Entity\User;
use App\Entity\Floor; // N'oublie pas cet import !
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class AppFixtures extends Fixture
{
    private UserPasswordHasherInterface $hasher;

    public function __construct(UserPasswordHasherInterface $hasher)
    {
        $this->hasher = $hasher;
    }

    public function load(ObjectManager $manager): void
    {
        // --- 1. CRÉATION DES UTILISATEURS ---
        $admin = new User();
        $admin->setEmail('admin@chalet.be');
        $admin->setFirstName('Admin');
        $admin->setLastName('Chalet');
        $admin->setRoles(['ROLE_ADMIN']);
        $admin->setPassword($this->hasher->hashPassword($admin, 'admin123'));
        $manager->persist($admin);

        $client = new User();
        $client->setEmail('client@chalet.be');
        $client->setFirstName('Jean');
        $client->setLastName('Dupont');
        $client->setRoles([]);
        $client->setPassword($this->hasher->hashPassword($client, 'client123'));
        $manager->persist($client);

        // --- 2. CRÉATION DES ÉTAGES ---
        $rdc = new Floor();
        $rdc->setName('Le Rez-de-chaussée');
        $rdc->setDescription('Un espace cosy de 80m² avec accès direct à la terrasse.');
        $rdc->setCapacity(4);
        $rdc->setBasePrice(120.00);
        $manager->persist($rdc);

        $etage = new Floor();
        $etage->setName("L'Étage Panoramique");
        $etage->setDescription('Vue imprenable sur la vallée. 3 chambres, grand salon cheminée.');
        $etage->setCapacity(6);
        $etage->setBasePrice(180.00);
        $manager->persist($etage);

        // On sauvegarde tout en base de données
        $manager->flush();
    }
}
