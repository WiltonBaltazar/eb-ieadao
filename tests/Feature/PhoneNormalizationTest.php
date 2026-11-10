<?php

namespace Tests\Feature;

use App\Models\User;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class PhoneNormalizationTest extends TestCase
{
    public static function phones(): array
    {
        return [
            'mozambique doubled' => ['+258258827622902', '+258827622902'],
            'portugal doubled' => ['+351351912345678', '+351912345678'],
            'brazil doubled' => ['+555511987654321', '+5511987654321'],
            'south africa doubled' => ['+2727821234567', '+27821234567'],
            'uk doubled' => ['+44447911123456', '+447911123456'],
            'usa doubled' => ['+112025550123', '+12025550123'],
            'cape verde doubled' => ['+2382389912345', '+2389912345'],
            'mozambique valid' => ['+258827622902', '+258827622902'],
            'french number starting with 33' => ['+33333123456', '+33333123456'],
            'kazakh number starting with 7' => ['+77012345678', '+77012345678'],
            'italian mobile starting with 39' => ['+393912345678', '+393912345678'],
            'not international' => ['827622902', '827622902'],
        ];
    }

    #[DataProvider('phones')]
    public function test_normalize_phone_drops_only_repeated_country_code(string $input, string $expected): void
    {
        $this->assertSame($expected, User::normalizePhone($input));
    }

    public static function legacyMatches(): array
    {
        return [
            'mozambique with +258' => ['842550315', '+258842550315', true],
            'mozambique bare' => ['842550315', '842550315', true],
            'portugal with +351' => ['937840720', '+351937840720', true],
            'portugal bare' => ['937840720', '937840720', true],
            'portugal number typed with +258' => ['937840720', '+258937840720', false],
            'mozambique number typed with +351' => ['842550315', '+351842550315', false],
            'brazil with +55' => ['11987654321', '+5511987654321', true],
            'brazil typed with +258' => ['11987654321', '+25811987654321', false],
            'south africa with +27' => ['821234567', '+27821234567', false],
            'south africa non-8 with +27' => ['721234567', '+27721234567', true],
            'south africa typed with +258' => ['721234567', '+258721234567', false],
            'uk with +44' => ['7911123456', '+447911123456', true],
            'uk typed with +258' => ['7911123456', '+2587911123456', false],
            'angola with +244' => ['923456789', '+244923456789', true],
            'angola typed with +258' => ['923456789', '+258923456789', false],
            'mozambique with 00258' => ['842550315', '00258842550315', true],
            'mozambique 258 without plus' => ['842550315', '258842550315', true],
        ];
    }

    #[DataProvider('legacyMatches')]
    public function test_legacy_local_number_matches_only_its_own_country(string $stored, string $typed, bool $matches): void
    {
        $this->assertSame($matches, in_array($stored, User::phoneVariants($typed), true));
    }
}
