<?php

namespace App\Controller\Admin;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

class DashboardController extends AbstractController
{
    #[Route('/admin/gestion', name: 'app_admin_dashboard')]
    #[IsGranted('ROLE_ADMIN')]
    public function manageReservations(): Response
    {
        return $this->render('admin/dashboard/index.html.twig');
    }
}
