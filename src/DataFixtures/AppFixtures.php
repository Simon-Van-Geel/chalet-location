<?php

namespace App\DataFixtures;

use App\Entity\User;
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
        $admin = new User();
        $admin->setEmail('admin@chalet.be');
        $admin->setRoles(['ROLE_ADMIN']);

        $password = $this->hasher->hashPassword($admin, 'admin123');
        $admin->setPassword($password);

        $manager->persist($admin);

        $client = new User();
        $client->setEmail('client@chalet.be');
        $client->setRoles([]);

        $passwordClient = $this->hasher->hashPassword($client, 'client123');
        $client->setPassword($passwordClient);

        $manager->persist($client);

        $manager->flush();
    }
}
