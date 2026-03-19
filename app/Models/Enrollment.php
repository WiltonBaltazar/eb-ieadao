<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Enrollment extends Model
{
    protected $fillable = [
        'student_id', 'classroom_id', 'academic_year',
        'enrolled_at', 'transferred_at', 'enrolled_by_id', 'notes',
    ];

    protected $casts = [
        'enrolled_at'    => 'datetime',
        'transferred_at' => 'datetime',
        'academic_year'  => 'integer',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function classroom(): BelongsTo
    {
        return $this->belongsTo(Classroom::class);
    }

    public function enrolledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'enrolled_by_id');
    }

    public function scopeActive(Builder $q): Builder
    {
        return $q->whereNull('transferred_at');
    }

    public function scopeForYear(Builder $q, int $year): Builder
    {
        return $q->where('academic_year', $year);
    }
}
