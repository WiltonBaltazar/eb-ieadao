<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Curriculum extends Model
{
    protected $fillable = ['name', 'description', 'is_active'];

    protected $casts = ['is_active' => 'boolean'];

    public function stages(): HasMany
    {
        return $this->hasMany(CurriculumStage::class)->orderBy('order');
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(CurriculumEnrollment::class);
    }
}
