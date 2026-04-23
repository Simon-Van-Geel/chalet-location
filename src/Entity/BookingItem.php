<?php

namespace App\Entity;

use App\Repository\BookingItemRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: BookingItemRepository::class)]
class BookingItem
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'bookingItems')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Booking $booking = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false)]
    private ?Floor $floor = null;

    #[ORM\Column]
    private ?float $priceAtBooking = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getBooking(): ?Booking
    {
        return $this->booking;
    }

    public function setBooking(?Booking $booking): static
    {
        $this->booking = $booking;

        return $this;
    }

    public function getFloor(): ?Floor
    {
        return $this->floor;
    }

    public function setFloor(?Floor $floor): static
    {
        $this->floor = $floor;

        return $this;
    }

    public function getPriceAtBooking(): ?float
    {
        return $this->priceAtBooking;
    }

    public function setPriceAtBooking(float $priceAtBooking): static
    {
        $this->priceAtBooking = $priceAtBooking;

        return $this;
    }
}
