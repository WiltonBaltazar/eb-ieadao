<?php

namespace App\Enums;

enum CheckInMethod: string
{
    case Manual = 'manual';
    case QR = 'qr';

    public function label(): string
    {
        return match($this) {
            self::Manual => 'Manual',
            self::QR => 'QR Code',
        };
    }
}
