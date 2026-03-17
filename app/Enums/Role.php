<?php

namespace App\Enums;

enum Role: string
{
    case Admin = 'admin';
    case Teacher = 'teacher';
    case Student = 'student';

    public function label(): string
    {
        return match($this) {
            Role::Admin => 'Administrador',
            Role::Teacher => 'Professor',
            Role::Student => 'Estudante',
        };
    }

    public static function managementRoles(): array
    {
        return [self::Admin, self::Teacher];
    }

    public static function managementValues(): array
    {
        return [self::Admin->value, self::Teacher->value];
    }
}
