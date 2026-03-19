<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Classroom extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'description',
        'meeting_day', 'meeting_time', 'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function teachers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'classroom_teacher');
    }

    public function students(): HasMany
    {
        return $this->hasMany(User::class, 'classroom_id');
    }

    public function studySessions(): HasMany
    {
        return $this->hasMany(StudySession::class);
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }

    public function studentsForYear(int $year): Builder
    {
        return User::whereHas('enrollments', fn ($q) => $q
            ->where('classroom_id', $this->id)
            ->where('academic_year', $year)
            ->whereNull('transferred_at')
        );
    }
}
