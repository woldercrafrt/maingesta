package com.example.maingest.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@Order(1)
public class SchemaMigrationRunner implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(SchemaMigrationRunner.class);

    private final JdbcTemplate jdbcTemplate;

    public SchemaMigrationRunner(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(String... args) {
        migrateEmpresaSuscripcion("empresa_suscripcion");
        migrateEmpresaSuscripcion("\"EMPRESA_SUSCRIPCION\"");

        migratePagoWompi("pago_wompi");
        migratePagoWompi("\"PAGO_WOMPI\"");
    }

    private void migrateEmpresaSuscripcion(String tableName) {
        try {
            jdbcTemplate.execute("ALTER TABLE " + tableName + " ADD COLUMN IF NOT EXISTS auto_renovar boolean");
            jdbcTemplate.execute("UPDATE " + tableName + " SET auto_renovar = false WHERE auto_renovar IS NULL");
            jdbcTemplate.execute("ALTER TABLE " + tableName + " ALTER COLUMN auto_renovar SET DEFAULT false");
            jdbcTemplate.execute("ALTER TABLE " + tableName + " ALTER COLUMN auto_renovar SET NOT NULL");

            jdbcTemplate.execute("ALTER TABLE " + tableName + " ADD COLUMN IF NOT EXISTS created_at timestamp");
            jdbcTemplate.execute("UPDATE " + tableName + " SET created_at = now() WHERE created_at IS NULL");
        } catch (Exception e) {
            log.debug("SchemaMigrationRunner: No se pudo migrar {}: {}", tableName, e.getMessage());
        }
    }

    private void migratePagoWompi(String tableName) {
        try {
            jdbcTemplate.execute(
                    "CREATE TABLE IF NOT EXISTS " + tableName + " (" +
                            "id bigserial PRIMARY KEY," +
                            "empresa_id bigint NOT NULL," +
                            "plan_id bigint NOT NULL," +
                            "reference varchar(255) NOT NULL," +
                            "amount_in_cents bigint NOT NULL," +
                            "currency varchar(3) NOT NULL DEFAULT 'COP'," +
                            "duracion_meses integer NOT NULL," +
                            "estado varchar(50) NOT NULL," +
                            "wompi_transaction_id varchar(255)," +
                            "wompi_status varchar(255)," +
                            "aplicada boolean NOT NULL DEFAULT false," +
                            "empresa_suscripcion_id bigint," +
                            "created_at timestamp," +
                            "updated_at timestamp" +
                            ")"
            );
        } catch (Exception e) {
            log.debug("SchemaMigrationRunner: No se pudo crear tabla {}: {}", tableName, e.getMessage());
            return;
        }

        try {
            jdbcTemplate.execute("ALTER TABLE " + tableName + " ADD COLUMN IF NOT EXISTS empresa_id bigint");
            jdbcTemplate.execute("ALTER TABLE " + tableName + " ADD COLUMN IF NOT EXISTS plan_id bigint");
            jdbcTemplate.execute("ALTER TABLE " + tableName + " ADD COLUMN IF NOT EXISTS reference varchar(255)");
            jdbcTemplate.execute("ALTER TABLE " + tableName + " ADD COLUMN IF NOT EXISTS amount_in_cents bigint");
            jdbcTemplate.execute("ALTER TABLE " + tableName + " ADD COLUMN IF NOT EXISTS currency varchar(3)");
            jdbcTemplate.execute("ALTER TABLE " + tableName + " ADD COLUMN IF NOT EXISTS duracion_meses integer");
            jdbcTemplate.execute("ALTER TABLE " + tableName + " ADD COLUMN IF NOT EXISTS estado varchar(50)");
            jdbcTemplate.execute("ALTER TABLE " + tableName + " ADD COLUMN IF NOT EXISTS wompi_transaction_id varchar(255)");
            jdbcTemplate.execute("ALTER TABLE " + tableName + " ADD COLUMN IF NOT EXISTS wompi_status varchar(255)");
            jdbcTemplate.execute("ALTER TABLE " + tableName + " ADD COLUMN IF NOT EXISTS aplicada boolean");
            jdbcTemplate.execute("ALTER TABLE " + tableName + " ADD COLUMN IF NOT EXISTS empresa_suscripcion_id bigint");
            jdbcTemplate.execute("ALTER TABLE " + tableName + " ADD COLUMN IF NOT EXISTS created_at timestamp");
            jdbcTemplate.execute("ALTER TABLE " + tableName + " ADD COLUMN IF NOT EXISTS updated_at timestamp");

            jdbcTemplate.execute("UPDATE " + tableName + " SET aplicada = false WHERE aplicada IS NULL");
            jdbcTemplate.execute("ALTER TABLE " + tableName + " ALTER COLUMN aplicada SET DEFAULT false");
        } catch (Exception e) {
            log.debug("SchemaMigrationRunner: No se pudo migrar {}: {}", tableName, e.getMessage());
        }
    }
}
