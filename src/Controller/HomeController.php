<?php

namespace App\Controller;

use App\Repository\FloorRepository;
use App\Repository\ImageRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class HomeController extends AbstractController
{
    #[Route('/', name: 'app_home')]
    public function index(FloorRepository $floorRepository, ImageRepository $imageRepo): Response
    {
        // On récupère tous les étages de la base de données
        $floors = $floorRepository->findAll();
        $images = $imageRepo->findBy([], ['position' => 'ASC']);

        return $this->render('home/index.html.twig', [
            'floors' => $floors,
            'images' => $images,
        ]);
    }
}
