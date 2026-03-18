<?php

namespace App\Enums;

enum CheckInMethod: string
{
    case Manual = 'manual';
    case QR = 'qr';
    case Auto = 'auto';

    public function label(): string
    {
        return match($this) {
            self::Manual => 'Manual',
            self::QR => 'QR Code',
            self::Auto => 'Automático',
        };
    }
}
