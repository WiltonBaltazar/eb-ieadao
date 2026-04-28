<?php

namespace App\Enums;

enum GrupoHomogeneo: string
{
    case Homens = 'homens';
    case Senhoras = 'senhoras';
    case Jovens = 'jovens';
    case Criancas = 'criancas';

    public function label(): string
    {
        return match($this) {
            self::Homens => 'Grupo Homogéneo de Homens',
            self::Senhoras => 'Grupo Homogéneo de Senhoras',
            self::Jovens => 'Grupo Homogéneo de Jovens',
            self::Criancas => 'Grupo Homogéneo de Crianças',
        };
    }

    public function short(): string
    {
        return match($this) {
            self::Homens => 'GHH',
            self::Senhoras => 'GHS',
            self::Jovens => 'GHJ',
            self::Criancas => 'GHC',
        };
    }
}
