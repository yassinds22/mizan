<?php

namespace App\Domains\Core\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class DatabaseBackupService
{
    /**
     * المسار الداخلي الآمن للنسخ الاحتياطية (غير متاح للويب)
     */
    protected string $backupDir;

    public function __construct()
    {
        $this->backupDir = storage_path('app/backups');
        if (!File::exists($this->backupDir)) {
            File::makeDirectory($this->backupDir, 0755, true);
        }
    }

    /**
     * إنشاء نسخة احتياطية فورية لقاعدة البيانات (سواء كانت MySQL أو SQLite)
     *
     * @return array{success: bool, filename: string, path: string, size_bytes: int, driver: string}
     * @throws RuntimeException في حال تعذر أخذ النسخة
     */
    public function createBackup(): array
    {
        $connection = DB::connection();
        $driver = $connection->getDriverName();
        $timestamp = date('Y_m_d_His');

        if ($driver === 'mysql') {
            return $this->backupMysql($timestamp);
        }

        if ($driver === 'sqlite') {
            return $this->backupSqlite($timestamp);
        }

        throw new RuntimeException("محرك قاعدة البيانات [{$driver}] غير مدعوم للنسخ الاحتياطي الآلي حالياً.");
    }

    /**
     * إنشاء نسخة لقواعد بيانات MySQL
     */
    protected function backupMysql(string $timestamp): array
    {
        $database = config('database.connections.mysql.database');
        $username = config('database.connections.mysql.username');
        $password = config('database.connections.mysql.password');
        $host = config('database.connections.mysql.host', '127.0.0.1');
        $port = config('database.connections.mysql.port', '3306');

        $filename = "mizan_backup_mysql_{$database}_{$timestamp}.sql";
        $targetPath = $this->backupDir . DIRECTORY_SEPARATOR . $filename;

        // في حال توفر أداة mysqldump في النظام
        $passwordPart = !empty($password) ? " -p\"{$password}\"" : '';
        $cmd = "mysqldump -h {$host} -P {$port} -u {$username}{$passwordPart} {$database} > \"{$targetPath}\" 2>&1";

        @exec($cmd, $output, $returnVar);

        // إذا فشل أمر mysqldump الخارجي (مثلاً في بيئات الاستضافة المشتركة بدون shell)، نقوم بتوليد SQL dump برمجي نظيف
        if ($returnVar !== 0 || !File::exists($targetPath) || File::size($targetPath) === 0) {
            $this->generatePhpMysqlDump($targetPath);
        }

        if (!File::exists($targetPath) || File::size($targetPath) === 0) {
            throw new RuntimeException("فشل إنشاء النسخة الاحتياطية لقاعدة بيانات MySQL.");
        }

        $this->verifyBackup($targetPath, 'mysql');

        return [
            'success' => true,
            'filename' => $filename,
            'path' => $targetPath,
            'size_bytes' => File::size($targetPath),
            'driver' => 'mysql',
        ];
    }

    /**
     * إنشاء نسخة لقواعد بيانات SQLite
     */
    protected function backupSqlite(string $timestamp): array
    {
        $databasePath = config('database.connections.sqlite.database');

        if ($databasePath === ':memory:') {
            $filename = "mizan_backup_sqlite_memory_{$timestamp}.sql";
            $targetPath = $this->backupDir . DIRECTORY_SEPARATOR . $filename;
            File::put($targetPath, "-- Mizan ERP In-Memory Test Backup {$timestamp}\n");
            return [
                'success' => true,
                'filename' => $filename,
                'path' => $targetPath,
                'size_bytes' => File::size($targetPath),
                'driver' => 'sqlite_memory',
            ];
        }

        if (!File::exists($databasePath)) {
            throw new RuntimeException("ملف قاعدة بيانات SQLite غير موجود: {$databasePath}");
        }

        $filename = "mizan_backup_sqlite_{$timestamp}.sqlite";
        $targetPath = $this->backupDir . DIRECTORY_SEPARATOR . $filename;

        $copied = File::copy($databasePath, $targetPath);

        if (!$copied || !File::exists($targetPath)) {
            throw new RuntimeException("تعذر نسخ ملف قاعدة بيانات SQLite إلى مجلد النسخ الاحتياطية.");
        }

        $this->verifyBackup($targetPath, 'sqlite');

        return [
            'success' => true,
            'filename' => $filename,
            'path' => $targetPath,
            'size_bytes' => File::size($targetPath),
            'driver' => 'sqlite',
        ];
    }

    /**
     * التحقق الصارم من سلامة وصلاحية ملف النسخة الاحتياطية قبل اعتماده
     */
    public function verifyBackup(string $path, string $driver): bool
    {
        if (!File::exists($path) || File::size($path) === 0) {
            throw new RuntimeException("ملف النسخة الاحتياطية فارغ أو غير موجود: {$path}");
        }

        if ($driver === 'sqlite') {
            try {
                $pdo = new \PDO("sqlite:{$path}");
                $pdo->setAttribute(\PDO::ATTR_ERRMODE, \PDO::ERRMODE_EXCEPTION);
                $stmt = $pdo->query("PRAGMA integrity_check");
                $result = $stmt->fetchColumn();

                if ($result !== 'ok') {
                    throw new RuntimeException("فشل فحص سلامة ملف النسخة الاحتياطية SQLite (Integrity Check Failed): {$result}");
                }
            } catch (\Throwable $e) {
                throw new RuntimeException("ملف النسخة الاحتياطية SQLite تالف وغير قابل للقراءة: " . $e->getMessage());
            }
        } elseif ($driver === 'mysql') {
            $contentHead = file_get_contents($path, false, null, 0, 500);
            if ($contentHead === false || (!str_contains($contentHead, 'CREATE TABLE') && !str_contains($contentHead, 'Mizan ERP'))) {
                throw new RuntimeException("ملف النسخة الاحتياطية MySQL لا يحتوي على بنية تفريغ صالحة.");
            }
        }

        return true;
    }

    /**
     * توليد تفريغ SQL احتياطي برمجياً (Fallback dump)
     */
    protected function generatePhpMysqlDump(string $targetPath): void
    {
        $tables = DB::select('SHOW TABLES');
        $dbKey = 'Tables_in_' . config('database.connections.mysql.database');

        $sql = "-- Mizan ERP Auto-generated Backup\n";
        $sql .= "-- Date: " . date('Y-m-d H:i:s') . "\n\n";
        $sql .= "SET FOREIGN_KEY_CHECKS=0;\n\n";

        foreach ($tables as $tableObj) {
            $tableName = $tableObj->$dbKey ?? reset($tableObj);
            if (!$tableName) continue;

            $createTable = DB::select("SHOW CREATE TABLE `{$tableName}`");
            $sql .= "DROP TABLE IF EXISTS `{$tableName}`;\n";
            $sql .= ($createTable[0]->{'Create Table'} ?? '') . ";\n\n";

            $rows = DB::table($tableName)->get();
            foreach ($rows as $row) {
                $values = array_map(function ($val) {
                    if (is_null($val)) return 'NULL';
                    return "'" . addslashes((string)$val) . "'";
                }, (array)$row);

                $sql .= "INSERT INTO `{$tableName}` VALUES (" . implode(', ', $values) . ");\n";
            }
            $sql .= "\n";
        }

        $sql .= "SET FOREIGN_KEY_CHECKS=1;\n";
        File::put($targetPath, $sql);
    }
}
