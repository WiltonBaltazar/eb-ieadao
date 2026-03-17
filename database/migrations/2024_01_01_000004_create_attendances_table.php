<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('attendances')) {
            return;
        }

        Schema::create('attendances', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('study_session_id');
            $table->unsignedBigInteger('student_id');
            $table->unsignedBigInteger('marked_by_id')->nullable();
            $table->string('check_in_method')->default('manual');
            $table->timestamp('checked_in_at');
            $table->timestamps();

            $table->unique(['study_session_id', 'student_id']);

            $table->foreign('study_session_id')->references('id')->on('study_sessions')->cascadeOnDelete();
            $table->foreign('student_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('marked_by_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendances');
    }
};
