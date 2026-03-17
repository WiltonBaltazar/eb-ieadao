<?php

namespace App\Exceptions;

class PhoneNotRegisteredException extends AttendanceException
{
    public function __construct(public readonly string $phone)
    {
        parent::__construct("Número de telefone não registado: {$phone}");
    }
}
