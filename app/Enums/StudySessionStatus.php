<?php

namespace App\Enums;

enum StudySessionStatus: string
{
    case Draft = 'draft';
    case Open = 'open';
    case Closed = 'closed';

    public function label(): string
    {
        return match($this) {
            self::Draft => 'Rascunho',
            self::Open => 'Aberta',
            self::Closed => 'Fechada',
        };
    }
}
