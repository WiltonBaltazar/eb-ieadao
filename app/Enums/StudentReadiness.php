<?php

namespace App\Enums;

enum StudentReadiness: string
{
    case NoClassroom = 'no_classroom';
    case AttendanceReady = 'attendance_ready';
    case SelfServiceActive = 'self_service_active';

    public function label(): string
    {
        return match($this) {
            self::NoClassroom => 'Sem Turma',
            self::AttendanceReady => 'Pronto para Presença',
            self::SelfServiceActive => 'Self-Service Ativo',
        };
    }

    public function color(): string
    {
        return match($this) {
            self::NoClassroom => 'gray',
            self::AttendanceReady => 'blue',
            self::SelfServiceActive => 'green',
        };
    }
}
