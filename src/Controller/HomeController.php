<?php

namespace App\Controller;

use App\Repository\FloorRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class HomeController extends AbstractController
{
    #[Route('/', name: 'app_home')]
    public function index(FloorRepository $floorRepository): Response
    {
        // On récupère tous les étages de la base de données
        $floors = $floorRepository->findAll();

        return $this->render('home/index.html.twig', [
            'floors' => $floors,
        ]);
    }
}
