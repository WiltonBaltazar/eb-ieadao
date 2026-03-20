<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $fillable = ['key', 'value'];

    public static function get(string $key, mixed $default = null): mixed
    {
        return static::where('key', $key)->value('value') ?? $default;
    }

    public static function set(string $key, mixed $value): void
    {
        static::updateOrCreate(['key' => $key], ['value' => $value]);
    }

    public static function qrTtlMinutes(): int
    {
        return (int) static::get('qr_ttl_minutes', 15);
    }

    public static function attendanceThreshold(): int
    {
        return (int) static::get('attendance_threshold', 75);
    }

    public static function appName(): string
    {
        return static::get('app_name', config('app.name'));
    }

    public static function currentAcademicYear(): int
    {
        return now()->year;
    }
}
