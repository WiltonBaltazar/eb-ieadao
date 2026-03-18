<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// This migration adds the teacher_id FK on classrooms AFTER users table exists
return new class extends Migration
{
    public function up(): void
    {
        // SQLite does not support adding FK constraints via ALTER TABLE after creation.
        // On SQLite we skip this; on MySQL/Postgres it works fine.
        if (config('database.default') === 'sqlite') {
            return;
        }

        Schema::table('classrooms', function (Blueprint $table) {
            $table->foreign('teacher_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        if (config('database.default') === 'sqlite') {
            return;
        }

        Schema::table('classrooms', function (Blueprint $table) {
            $table->dropForeign(['teacher_id']);
        });
    }
};
