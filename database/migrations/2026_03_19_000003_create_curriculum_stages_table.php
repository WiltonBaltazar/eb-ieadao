<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('curriculum_stages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('curriculum_id')->constrained('curricula')->cascadeOnDelete();
            $table->unsignedTinyInteger('order')->default(1);
            $table->string('name');
            $table->text('description')->nullable();
            $table->unsignedTinyInteger('required_lessons')->default(0);
            $table->timestamps();

            $table->unique(['curriculum_id', 'order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('curriculum_stages');
    }
};
