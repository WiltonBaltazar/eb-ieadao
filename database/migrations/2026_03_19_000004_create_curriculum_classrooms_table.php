<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('curriculum_classrooms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('curriculum_stage_id')->constrained('curriculum_stages')->cascadeOnDelete();
            $table->foreignId('classroom_id')->constrained('classrooms')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['curriculum_stage_id', 'classroom_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('curriculum_classrooms');
    }
};
