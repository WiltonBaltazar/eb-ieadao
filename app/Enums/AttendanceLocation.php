<?php

namespace App\Enums;

enum AttendanceLocation: string
{
    case NaIgreja = 'na_igreja';
    case Online = 'online';

    public function label(): string
    {
        return match($this) {
            self::NaIgreja => 'Na igreja',
            self::Online => 'Online',
        };
    }
}
