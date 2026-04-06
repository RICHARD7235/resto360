-- Migration: M08 Caisse Seed — La Cabane Qui Fume
-- Date: 2026-04-06
-- Description: Seed data for LCQF Caisse module —
--              30 Z de caisse (Mar 7–Apr 5, 2026), 1 bank statement (~40 transactions),
--              ~10 reconciliations, ~50 treasury entries, 2 VAT periods.

DO $$
DECLARE
  v_restaurant_id uuid := 'a0000000-0000-0000-0000-000000000001';

  -- ── Cash register closings ─────────────────────────────────────────────────
  v_z_mar07 uuid; v_z_mar08 uuid; v_z_mar09 uuid; v_z_mar10 uuid;
  v_z_mar11 uuid; v_z_mar12 uuid; v_z_mar13 uuid; v_z_mar14 uuid;
  v_z_mar15 uuid; v_z_mar16 uuid; v_z_mar17 uuid; v_z_mar18 uuid;
  v_z_mar19 uuid; v_z_mar20 uuid; v_z_mar21 uuid; v_z_mar22 uuid;
  v_z_mar23 uuid; v_z_mar24 uuid; v_z_mar25 uuid; v_z_mar26 uuid;
  v_z_mar27 uuid; v_z_mar28 uuid; v_z_mar29 uuid; v_z_mar30 uuid;
  v_z_mar31 uuid; v_z_apr01 uuid; v_z_apr02 uuid; v_z_apr03 uuid;
  v_z_apr04 uuid; v_z_apr05 uuid;

  -- ── Bank statement ─────────────────────────────────────────────────────────
  v_stmt_mar uuid;

  -- ── Bank transactions (CB encaissements matched to Z) ─────────────────────
  v_bt_cb_mar07 uuid; v_bt_cb_mar08 uuid; v_bt_cb_mar09 uuid;
  v_bt_cb_mar10 uuid; v_bt_cb_mar11 uuid; v_bt_cb_mar12 uuid;
  v_bt_cb_mar14 uuid; v_bt_cb_mar15 uuid; v_bt_cb_mar17 uuid;
  v_bt_cb_mar18 uuid; v_bt_cb_mar20 uuid;

  -- ── Treasury source IDs (closings re-used as source_id) ───────────────────
  -- (we reuse the closing UUIDs as source_id for M08_closing entries)

BEGIN

  -- ============================================================
  -- 1. CASH REGISTER CLOSINGS — 30 days (Mar 7 → Apr 5, 2026)
  -- ============================================================
  -- Weekday (Mon–Thu): CA TTC ~800–1500€
  -- Friday:            CA TTC ~1200–2000€
  -- Weekend (Sat–Sun): CA TTC ~1500–2500€
  --
  -- Payment split: ~60% CB, ~25% cash, ~10% chèques, ~5% tickets resto
  -- TVA: ~70% at 10%, ~20% at 20%, ~10% at 5.5%  (on base TTC)
  --   vat_10  = TTC * 0.70 * (10/110)
  --   vat_20  = TTC * 0.20 * (20/120)
  --   vat_5_5 = TTC * 0.10 * (5.5/105.5)
  --   total_ht = TTC - vat_5_5 - vat_10 - vat_20
  -- Couverts: TTC / 30 (avg ticket ~30€)
  -- Tickets:  couverts * 0.70

  -- Mar 7 (Sat — weekend)
  v_z_mar07 := gen_random_uuid();
  INSERT INTO cash_register_closings
    (id, restaurant_id, closing_date, total_ttc, total_ht,
     total_cb, total_cash, total_check, total_ticket_resto, total_other,
     cover_count, ticket_count, vat_5_5, vat_10, vat_20, source)
  VALUES (
    v_z_mar07, v_restaurant_id, '2026-03-07',
    1820.00, 1559.63,
    1092.00, 455.00, 182.00, 91.00, 0.00,
    61, 43,
    9.49, 115.27, 60.67,
    'manual'
  );

  -- Mar 8 (Sun — weekend)
  v_z_mar08 := gen_random_uuid();
  INSERT INTO cash_register_closings
    (id, restaurant_id, closing_date, total_ttc, total_ht,
     total_cb, total_cash, total_check, total_ticket_resto, total_other,
     cover_count, ticket_count, vat_5_5, vat_10, vat_20, source)
  VALUES (
    v_z_mar08, v_restaurant_id, '2026-03-08',
    2140.00, 1834.20,
    1284.00, 535.00, 214.00, 107.00, 0.00,
    71, 50,
    11.16, 135.46, 71.33,
    'manual'
  );

  -- Mar 9 (Mon — weekday)
  v_z_mar09 := gen_random_uuid();
  INSERT INTO cash_register_closings
    (id, restaurant_id, closing_date, total_ttc, total_ht,
     total_cb, total_cash, total_check, total_ticket_resto, total_other,
     cover_count, ticket_count, vat_5_5, vat_10, vat_20, source)
  VALUES (
    v_z_mar09, v_restaurant_id, '2026-03-09',
    980.00, 839.98,
    588.00, 245.00, 98.00, 49.00, 0.00,
    33, 23,
    5.11, 62.00, 32.67,
    'manual'
  );

  -- Mar 10 (Tue — weekday)
  v_z_mar10 := gen_random_uuid();
  INSERT INTO cash_register_closings
    (id, restaurant_id, closing_date, total_ttc, total_ht,
     total_cb, total_cash, total_check, total_ticket_resto, total_other,
     cover_count, ticket_count, vat_5_5, vat_10, vat_20, source)
  VALUES (
    v_z_mar10, v_restaurant_id, '2026-03-10',
    1050.00, 900.13,
    630.00, 262.50, 105.00, 52.50, 0.00,
    35, 25,
    5.47, 66.43, 35.00,
    'manual'
  );

  -- Mar 11 (Wed — weekday)
  v_z_mar11 := gen_random_uuid();
  INSERT INTO cash_register_closings
    (id, restaurant_id, closing_date, total_ttc, total_ht,
     total_cb, total_cash, total_check, total_ticket_resto, total_other,
     cover_count, ticket_count, vat_5_5, vat_10, vat_20, source)
  VALUES (
    v_z_mar11, v_restaurant_id, '2026-03-11',
    1120.00, 960.00,
    672.00, 280.00, 112.00, 56.00, 0.00,
    37, 26,
    5.83, 70.91, 37.33,
    'manual'
  );

  -- Mar 12 (Thu — weekday)
  v_z_mar12 := gen_random_uuid();
  INSERT INTO cash_register_closings
    (id, restaurant_id, closing_date, total_ttc, total_ht,
     total_cb, total_cash, total_check, total_ticket_resto, total_other,
     cover_count, ticket_count, vat_5_5, vat_10, vat_20, source)
  VALUES (
    v_z_mar12, v_restaurant_id, '2026-03-12',
    1340.00, 1148.50,
    804.00, 335.00, 134.00, 67.00, 0.00,
    45, 31,
    6.98, 84.73, 44.67,
    'manual'
  );

  -- Mar 13 (Fri)
  v_z_mar13 := gen_random_uuid();
  INSERT INTO cash_register_closings
    (id, restaurant_id, closing_date, total_ttc, total_ht,
     total_cb, total_cash, total_check, total_ticket_resto, total_other,
     cover_count, ticket_count, vat_5_5, vat_10, vat_20, source)
  VALUES (
    v_z_mar13, v_restaurant_id, '2026-03-13',
    1680.00, 1440.26,
    1008.00, 420.00, 168.00, 84.00, 0.00,
    56, 39,
    8.76, 106.36, 56.00,
    'manual'
  );

  -- Mar 14 (Sat — weekend)
  v_z_mar14 := gen_random_uuid();
  INSERT INTO cash_register_closings
    (id, restaurant_id, closing_date, total_ttc, total_ht,
     total_cb, total_cash, total_check, total_ticket_resto, total_other,
     cover_count, ticket_count, vat_5_5, vat_10, vat_20, source)
  VALUES (
    v_z_mar14, v_restaurant_id, '2026-03-14',
    2320.00, 1989.32,
    1392.00, 580.00, 232.00, 116.00, 0.00,
    77, 54,
    12.10, 146.91, 77.33,
    'manual'
  );

  -- Mar 15 (Sun — weekend)
  v_z_mar15 := gen_random_uuid();
  INSERT INTO cash_register_closings
    (id, restaurant_id, closing_date, total_ttc, total_ht,
     total_cb, total_cash, total_check, total_ticket_resto, total_other,
     cover_count, ticket_count, vat_5_5, vat_10, vat_20, source)
  VALUES (
    v_z_mar15, v_restaurant_id, '2026-03-15',
    1960.00, 1680.33,
    1176.00, 490.00, 196.00, 98.00, 0.00,
    65, 46,
    10.22, 124.00, 65.33,
    'manual'
  );

  -- Mar 16 (Mon — weekday)
  v_z_mar16 := gen_random_uuid();
  INSERT INTO cash_register_closings
    (id, restaurant_id, closing_date, total_ttc, total_ht,
     total_cb, total_cash, total_check, total_ticket_resto, total_other,
     cover_count, ticket_count, vat_5_5, vat_10, vat_20, source)
  VALUES (
    v_z_mar16, v_restaurant_id, '2026-03-16',
    870.00, 745.62,
    522.00, 217.50, 87.00, 43.50, 0.00,
    29, 20,
    4.54, 55.09, 29.00,
    'manual'
  );

  -- Mar 17 (Tue — weekday)
  v_z_mar17 := gen_random_uuid();
  INSERT INTO cash_register_closings
    (id, restaurant_id, closing_date, total_ttc, total_ht,
     total_cb, total_cash, total_check, total_ticket_resto, total_other,
     cover_count, ticket_count, vat_5_5, vat_10, vat_20, source)
  VALUES (
    v_z_mar17, v_restaurant_id, '2026-03-17',
    1090.00, 934.64,
    654.00, 272.50, 109.00, 54.50, 0.00,
    36, 25,
    5.68, 69.00, 36.33,
    'manual'
  );

  -- Mar 18 (Wed — weekday)
  v_z_mar18 := gen_random_uuid();
  INSERT INTO cash_register_closings
    (id, restaurant_id, closing_date, total_ttc, total_ht,
     total_cb, total_cash, total_check, total_ticket_resto, total_other,
     cover_count, ticket_count, vat_5_5, vat_10, vat_20, source)
  VALUES (
    v_z_mar18, v_restaurant_id, '2026-03-18',
    1250.00, 1071.60,
    750.00, 312.50, 125.00, 62.50, 0.00,
    42, 29,
    6.52, 79.09, 41.67,
    'manual'
  );

  -- Mar 19 (Thu — weekday)
  v_z_mar19 := gen_random_uuid();
  INSERT INTO cash_register_closings
    (id, restaurant_id, closing_date, total_ttc, total_ht,
     total_cb, total_cash, total_check, total_ticket_resto, total_other,
     cover_count, ticket_count, vat_5_5, vat_10, vat_20, source)
  VALUES (
    v_z_mar19, v_restaurant_id, '2026-03-19',
    1450.00, 1243.18,
    870.00, 362.50, 145.00, 72.50, 0.00,
    48, 34,
    7.56, 91.82, 48.33,
    'manual'
  );

  -- Mar 20 (Fri)
  v_z_mar20 := gen_random_uuid();
  INSERT INTO cash_register_closings
    (id, restaurant_id, closing_date, total_ttc, total_ht,
     total_cb, total_cash, total_check, total_ticket_resto, total_other,
     cover_count, ticket_count, vat_5_5, vat_10, vat_20, source)
  VALUES (
    v_z_mar20, v_restaurant_id, '2026-03-20',
    1760.00, 1509.15,
    1056.00, 440.00, 176.00, 88.00, 0.00,
    59, 41,
    9.17, 111.27, 58.67,
    'manual'
  );

  -- Mar 21 (Sat — weekend)
  v_z_mar21 := gen_random_uuid();
  INSERT INTO cash_register_closings
    (id, restaurant_id, closing_date, total_ttc, total_ht,
     total_cb, total_cash, total_check, total_ticket_resto, total_other,
     cover_count, ticket_count, vat_5_5, vat_10, vat_20, source)
  VALUES (
    v_z_mar21, v_restaurant_id, '2026-03-21',
    2480.00, 2126.52,
    1488.00, 620.00, 248.00, 124.00, 0.00,
    83, 58,
    12.93, 157.09, 82.67,
    'manual'
  );

  -- Mar 22 (Sun — weekend)
  v_z_mar22 := gen_random_uuid();
  INSERT INTO cash_register_closings
    (id, restaurant_id, closing_date, total_ttc, total_ht,
     total_cb, total_cash, total_check, total_ticket_resto, total_other,
     cover_count, ticket_count, vat_5_5, vat_10, vat_20, source)
  VALUES (
    v_z_mar22, v_restaurant_id, '2026-03-22',
    2050.00, 1757.66,
    1230.00, 512.50, 205.00, 102.50, 0.00,
    68, 48,
    10.69, 129.82, 68.33,
    'manual'
  );

  -- Mar 23 (Mon — weekday)
  v_z_mar23 := gen_random_uuid();
  INSERT INTO cash_register_closings
    (id, restaurant_id, closing_date, total_ttc, total_ht,
     total_cb, total_cash, total_check, total_ticket_resto, total_other,
     cover_count, ticket_count, vat_5_5, vat_10, vat_20, source)
  VALUES (
    v_z_mar23, v_restaurant_id, '2026-03-23',
    920.00, 788.63,
    552.00, 230.00, 92.00, 46.00, 0.00,
    31, 22,
    4.80, 58.18, 30.67,
    'manual'
  );

  -- Mar 24 (Tue — weekday)
  v_z_mar24 := gen_random_uuid();
  INSERT INTO cash_register_closings
    (id, restaurant_id, closing_date, total_ttc, total_ht,
     total_cb, total_cash, total_check, total_ticket_resto, total_other,
     cover_count, ticket_count, vat_5_5, vat_10, vat_20, source)
  VALUES (
    v_z_mar24, v_restaurant_id, '2026-03-24',
    1100.00, 943.28,
    660.00, 275.00, 110.00, 55.00, 0.00,
    37, 26,
    5.73, 69.64, 36.67,
    'manual'
  );

  -- Mar 25 (Wed — weekday)
  v_z_mar25 := gen_random_uuid();
  INSERT INTO cash_register_closings
    (id, restaurant_id, closing_date, total_ttc, total_ht,
     total_cb, total_cash, total_check, total_ticket_resto, total_other,
     cover_count, ticket_count, vat_5_5, vat_10, vat_20, source)
  VALUES (
    v_z_mar25, v_restaurant_id, '2026-03-25',
    1280.00, 1097.56,
    768.00, 320.00, 128.00, 64.00, 0.00,
    43, 30,
    6.67, 81.09, 42.67,
    'manual'
  );

  -- Mar 26 (Thu — weekday)
  v_z_mar26 := gen_random_uuid();
  INSERT INTO cash_register_closings
    (id, restaurant_id, closing_date, total_ttc, total_ht,
     total_cb, total_cash, total_check, total_ticket_resto, total_other,
     cover_count, ticket_count, vat_5_5, vat_10, vat_20, source)
  VALUES (
    v_z_mar26, v_restaurant_id, '2026-03-26',
    1390.00, 1191.94,
    834.00, 347.50, 139.00, 69.50, 0.00,
    46, 32,
    7.25, 88.00, 46.33,
    'manual'
  );

  -- Mar 27 (Fri)
  v_z_mar27 := gen_random_uuid();
  INSERT INTO cash_register_closings
    (id, restaurant_id, closing_date, total_ttc, total_ht,
     total_cb, total_cash, total_check, total_ticket_resto, total_other,
     cover_count, ticket_count, vat_5_5, vat_10, vat_20, source)
  VALUES (
    v_z_mar27, v_restaurant_id, '2026-03-27',
    1850.00, 1586.55,
    1110.00, 462.50, 185.00, 92.50, 0.00,
    62, 43,
    9.64, 117.09, 61.67,
    'manual'
  );

  -- Mar 28 (Sat — weekend)
  v_z_mar28 := gen_random_uuid();
  INSERT INTO cash_register_closings
    (id, restaurant_id, closing_date, total_ttc, total_ht,
     total_cb, total_cash, total_check, total_ticket_resto, total_other,
     cover_count, ticket_count, vat_5_5, vat_10, vat_20, source)
  VALUES (
    v_z_mar28, v_restaurant_id, '2026-03-28',
    2380.00, 2040.37,
    1428.00, 595.00, 238.00, 119.00, 0.00,
    79, 55,
    12.41, 150.73, 79.33,
    'manual'
  );

  -- Mar 29 (Sun — weekend)
  v_z_mar29 := gen_random_uuid();
  INSERT INTO cash_register_closings
    (id, restaurant_id, closing_date, total_ttc, total_ht,
     total_cb, total_cash, total_check, total_ticket_resto, total_other,
     cover_count, ticket_count, vat_5_5, vat_10, vat_20, source)
  VALUES (
    v_z_mar29, v_restaurant_id, '2026-03-29',
    1990.00, 1706.83,
    1194.00, 497.50, 199.00, 99.50, 0.00,
    66, 46,
    10.38, 126.00, 66.33,
    'manual'
  );

  -- Mar 30 (Mon — weekday)
  v_z_mar30 := gen_random_uuid();
  INSERT INTO cash_register_closings
    (id, restaurant_id, closing_date, total_ttc, total_ht,
     total_cb, total_cash, total_check, total_ticket_resto, total_other,
     cover_count, ticket_count, vat_5_5, vat_10, vat_20, source)
  VALUES (
    v_z_mar30, v_restaurant_id, '2026-03-30',
    860.00, 737.37,
    516.00, 215.00, 86.00, 43.00, 0.00,
    29, 20,
    4.48, 54.45, 28.67,
    'manual'
  );

  -- Mar 31 (Tue — weekday)
  v_z_mar31 := gen_random_uuid();
  INSERT INTO cash_register_closings
    (id, restaurant_id, closing_date, total_ttc, total_ht,
     total_cb, total_cash, total_check, total_ticket_resto, total_other,
     cover_count, ticket_count, vat_5_5, vat_10, vat_20, source)
  VALUES (
    v_z_mar31, v_restaurant_id, '2026-03-31',
    1130.00, 969.17,
    678.00, 282.50, 113.00, 56.50, 0.00,
    38, 27,
    5.89, 71.45, 37.67,
    'manual'
  );

  -- Apr 1 (Wed — weekday)
  v_z_apr01 := gen_random_uuid();
  INSERT INTO cash_register_closings
    (id, restaurant_id, closing_date, total_ttc, total_ht,
     total_cb, total_cash, total_check, total_ticket_resto, total_other,
     cover_count, ticket_count, vat_5_5, vat_10, vat_20, source)
  VALUES (
    v_z_apr01, v_restaurant_id, '2026-04-01',
    1170.00, 1003.27,
    702.00, 292.50, 117.00, 58.50, 0.00,
    39, 27,
    6.10, 74.00, 39.00,
    'manual'
  );

  -- Apr 2 (Thu — weekday)
  v_z_apr02 := gen_random_uuid();
  INSERT INTO cash_register_closings
    (id, restaurant_id, closing_date, total_ttc, total_ht,
     total_cb, total_cash, total_check, total_ticket_resto, total_other,
     cover_count, ticket_count, vat_5_5, vat_10, vat_20, source)
  VALUES (
    v_z_apr02, v_restaurant_id, '2026-04-02',
    1310.00, 1123.60,
    786.00, 327.50, 131.00, 65.50, 0.00,
    44, 31,
    6.83, 82.91, 43.67,
    'manual'
  );

  -- Apr 3 (Fri)
  v_z_apr03 := gen_random_uuid();
  INSERT INTO cash_register_closings
    (id, restaurant_id, closing_date, total_ttc, total_ht,
     total_cb, total_cash, total_check, total_ticket_resto, total_other,
     cover_count, ticket_count, vat_5_5, vat_10, vat_20, source)
  VALUES (
    v_z_apr03, v_restaurant_id, '2026-04-03',
    1740.00, 1492.34,
    1044.00, 435.00, 174.00, 87.00, 0.00,
    58, 41,
    9.07, 110.18, 58.00,
    'manual'
  );

  -- Apr 4 (Sat — weekend)
  v_z_apr04 := gen_random_uuid();
  INSERT INTO cash_register_closings
    (id, restaurant_id, closing_date, total_ttc, total_ht,
     total_cb, total_cash, total_check, total_ticket_resto, total_other,
     cover_count, ticket_count, vat_5_5, vat_10, vat_20, source)
  VALUES (
    v_z_apr04, v_restaurant_id, '2026-04-04',
    2260.00, 1938.41,
    1356.00, 565.00, 226.00, 113.00, 0.00,
    75, 53,
    11.78, 143.09, 75.33,
    'manual'
  );

  -- Apr 5 (Sun — weekend)
  v_z_apr05 := gen_random_uuid();
  INSERT INTO cash_register_closings
    (id, restaurant_id, closing_date, total_ttc, total_ht,
     total_cb, total_cash, total_check, total_ticket_resto, total_other,
     cover_count, ticket_count, vat_5_5, vat_10, vat_20, source)
  VALUES (
    v_z_apr05, v_restaurant_id, '2026-04-05',
    2100.00, 1800.81,
    1260.00, 525.00, 210.00, 105.00, 0.00,
    70, 49,
    10.95, 133.09, 70.00,
    'manual'
  );

  -- ============================================================
  -- 2. BANK STATEMENT — Mars 2026
  -- ============================================================
  v_stmt_mar := gen_random_uuid();
  INSERT INTO bank_statements
    (id, restaurant_id, bank_name, account_label, statement_date, file_name)
  VALUES (
    v_stmt_mar, v_restaurant_id,
    'Crédit Agricole', 'Compte courant pro LCQF 00040-128752',
    '2026-03-31', 'releve_mars_2026.pdf'
  );

  -- ============================================================
  -- 3. BANK TRANSACTIONS — ~40 lines for March 2026
  -- ============================================================
  -- CB encaissements (CB amounts from Z, credited 1-2 days later)
  -- Positive = credit, negative = debit

  -- Week 1 CB encaissements
  v_bt_cb_mar07 := gen_random_uuid();
  INSERT INTO bank_transactions
    (id, statement_id, restaurant_id, transaction_date, value_date,
     label, amount, category)
  VALUES (
    v_bt_cb_mar07, v_stmt_mar, v_restaurant_id,
    '2026-03-09', '2026-03-09',
    'VIREMENT CB TPE 07/03', 1092.00, 'cb_encaissement'
  );

  v_bt_cb_mar08 := gen_random_uuid();
  INSERT INTO bank_transactions
    (id, statement_id, restaurant_id, transaction_date, value_date,
     label, amount, category)
  VALUES (
    v_bt_cb_mar08, v_stmt_mar, v_restaurant_id,
    '2026-03-10', '2026-03-10',
    'VIREMENT CB TPE 08/03', 1284.00, 'cb_encaissement'
  );

  v_bt_cb_mar09 := gen_random_uuid();
  INSERT INTO bank_transactions
    (id, statement_id, restaurant_id, transaction_date, value_date,
     label, amount, category)
  VALUES (
    v_bt_cb_mar09, v_stmt_mar, v_restaurant_id,
    '2026-03-11', '2026-03-11',
    'VIREMENT CB TPE 09/03', 588.00, 'cb_encaissement'
  );

  v_bt_cb_mar10 := gen_random_uuid();
  INSERT INTO bank_transactions
    (id, statement_id, restaurant_id, transaction_date, value_date,
     label, amount, category)
  VALUES (
    v_bt_cb_mar10, v_stmt_mar, v_restaurant_id,
    '2026-03-12', '2026-03-12',
    'VIREMENT CB TPE 10/03', 630.00, 'cb_encaissement'
  );

  v_bt_cb_mar11 := gen_random_uuid();
  INSERT INTO bank_transactions
    (id, statement_id, restaurant_id, transaction_date, value_date,
     label, amount, category)
  VALUES (
    v_bt_cb_mar11, v_stmt_mar, v_restaurant_id,
    '2026-03-13', '2026-03-13',
    'VIREMENT CB TPE 11/03', 672.00, 'cb_encaissement'
  );

  v_bt_cb_mar12 := gen_random_uuid();
  INSERT INTO bank_transactions
    (id, statement_id, restaurant_id, transaction_date, value_date,
     label, amount, category)
  VALUES (
    v_bt_cb_mar12, v_stmt_mar, v_restaurant_id,
    '2026-03-14', '2026-03-14',
    'VIREMENT CB TPE 12/03', 804.00, 'cb_encaissement'
  );

  v_bt_cb_mar14 := gen_random_uuid();
  INSERT INTO bank_transactions
    (id, statement_id, restaurant_id, transaction_date, value_date,
     label, amount, category)
  VALUES (
    v_bt_cb_mar14, v_stmt_mar, v_restaurant_id,
    '2026-03-16', '2026-03-16',
    'VIREMENT CB TPE 14/03', 1392.00, 'cb_encaissement'
  );

  v_bt_cb_mar15 := gen_random_uuid();
  INSERT INTO bank_transactions
    (id, statement_id, restaurant_id, transaction_date, value_date,
     label, amount, category)
  VALUES (
    v_bt_cb_mar15, v_stmt_mar, v_restaurant_id,
    '2026-03-17', '2026-03-17',
    'VIREMENT CB TPE 15/03', 1176.00, 'cb_encaissement'
  );

  v_bt_cb_mar17 := gen_random_uuid();
  INSERT INTO bank_transactions
    (id, statement_id, restaurant_id, transaction_date, value_date,
     label, amount, category)
  VALUES (
    v_bt_cb_mar17, v_stmt_mar, v_restaurant_id,
    '2026-03-19', '2026-03-19',
    'VIREMENT CB TPE 17/03', 654.00, 'cb_encaissement'
  );

  v_bt_cb_mar18 := gen_random_uuid();
  INSERT INTO bank_transactions
    (id, statement_id, restaurant_id, transaction_date, value_date,
     label, amount, category)
  VALUES (
    v_bt_cb_mar18, v_stmt_mar, v_restaurant_id,
    '2026-03-20', '2026-03-20',
    'VIREMENT CB TPE 18/03', 750.00, 'cb_encaissement'
  );

  v_bt_cb_mar20 := gen_random_uuid();
  INSERT INTO bank_transactions
    (id, statement_id, restaurant_id, transaction_date, value_date,
     label, amount, category)
  VALUES (
    v_bt_cb_mar20, v_stmt_mar, v_restaurant_id,
    '2026-03-22', '2026-03-22',
    'VIREMENT CB TPE 20/03', 1056.00, 'cb_encaissement'
  );

  -- CB encaissements (weeks 3-4, unreconciled)
  INSERT INTO bank_transactions
    (id, statement_id, restaurant_id, transaction_date, value_date,
     label, amount, category)
  VALUES
    (gen_random_uuid(), v_stmt_mar, v_restaurant_id,
     '2026-03-23', '2026-03-23', 'VIREMENT CB TPE 21/03', 1488.00, 'cb_encaissement'),
    (gen_random_uuid(), v_stmt_mar, v_restaurant_id,
     '2026-03-24', '2026-03-24', 'VIREMENT CB TPE 22/03', 1230.00, 'cb_encaissement'),
    (gen_random_uuid(), v_stmt_mar, v_restaurant_id,
     '2026-03-25', '2026-03-25', 'VIREMENT CB TPE 23/03', 552.00,  'cb_encaissement'),
    (gen_random_uuid(), v_stmt_mar, v_restaurant_id,
     '2026-03-26', '2026-03-26', 'VIREMENT CB TPE 24/03', 660.00,  'cb_encaissement'),
    (gen_random_uuid(), v_stmt_mar, v_restaurant_id,
     '2026-03-27', '2026-03-27', 'VIREMENT CB TPE 25/03', 768.00,  'cb_encaissement'),
    (gen_random_uuid(), v_stmt_mar, v_restaurant_id,
     '2026-03-28', '2026-03-28', 'VIREMENT CB TPE 26/03', 834.00,  'cb_encaissement'),
    (gen_random_uuid(), v_stmt_mar, v_restaurant_id,
     '2026-03-29', '2026-03-29', 'VIREMENT CB TPE 27/03', 1110.00, 'cb_encaissement'),
    (gen_random_uuid(), v_stmt_mar, v_restaurant_id,
     '2026-03-30', '2026-03-30', 'VIREMENT CB TPE 28/03', 1428.00, 'cb_encaissement'),
    (gen_random_uuid(), v_stmt_mar, v_restaurant_id,
     '2026-03-31', '2026-03-31', 'VIREMENT CB TPE 29/03', 1194.00, 'cb_encaissement');

  -- Prélèvements fournisseurs
  INSERT INTO bank_transactions
    (id, statement_id, restaurant_id, transaction_date, value_date,
     label, amount, category)
  VALUES
    (gen_random_uuid(), v_stmt_mar, v_restaurant_id,
     '2026-03-05', '2026-03-05', 'PRELVT METRO CASH & CARRY', -1840.00, 'supplier'),
    (gen_random_uuid(), v_stmt_mar, v_restaurant_id,
     '2026-03-10', '2026-03-10', 'PRELVT TRANSGOURMET VIANDES', -2150.00, 'supplier'),
    (gen_random_uuid(), v_stmt_mar, v_restaurant_id,
     '2026-03-15', '2026-03-15', 'PRELVT SYSCO BOISSONS', -780.00, 'supplier'),
    (gen_random_uuid(), v_stmt_mar, v_restaurant_id,
     '2026-03-22', '2026-03-22', 'PRELVT EPISAVEURS EPICERIE', -620.00, 'supplier'),
    (gen_random_uuid(), v_stmt_mar, v_restaurant_id,
     '2026-03-28', '2026-03-28', 'PRELVT FRUITS & LEGUMES SARTHE', -510.00, 'supplier');

  -- Virement salaires
  INSERT INTO bank_transactions
    (id, statement_id, restaurant_id, transaction_date, value_date,
     label, amount, category)
  VALUES
    (gen_random_uuid(), v_stmt_mar, v_restaurant_id,
     '2026-03-28', '2026-03-28', 'VIR SALAIRES MARS 2026', -8120.00, 'salary');

  -- Prélèvement loyer
  INSERT INTO bank_transactions
    (id, statement_id, restaurant_id, transaction_date, value_date,
     label, amount, category)
  VALUES
    (gen_random_uuid(), v_stmt_mar, v_restaurant_id,
     '2026-03-01', '2026-03-01', 'PRELVT LOYER MARS - SCI LES CHENES', -1800.00, 'rent');

  -- Prélèvement assurance
  INSERT INTO bank_transactions
    (id, statement_id, restaurant_id, transaction_date, value_date,
     label, amount, category)
  VALUES
    (gen_random_uuid(), v_stmt_mar, v_restaurant_id,
     '2026-03-05', '2026-03-05', 'PRELVT GROUPAMA MULTIRISQUE PRO', -450.00, 'insurance');

  -- Frais bancaires
  INSERT INTO bank_transactions
    (id, statement_id, restaurant_id, transaction_date, value_date,
     label, amount, category)
  VALUES
    (gen_random_uuid(), v_stmt_mar, v_restaurant_id,
     '2026-03-31', '2026-03-31', 'FRAIS TENUE COMPTE MARS 2026', -32.50, 'other');

  -- ============================================================
  -- 4. RECONCILIATIONS — mark ~10 CB transactions as reconciled
  --    (first 11 CB encaissements matched to their Z de caisse)
  -- ============================================================
  UPDATE bank_transactions
  SET is_reconciled   = true,
      reconciled_with = v_z_mar07,
      reconciled_at   = now()
  WHERE id = v_bt_cb_mar07;

  UPDATE bank_transactions
  SET is_reconciled   = true,
      reconciled_with = v_z_mar08,
      reconciled_at   = now()
  WHERE id = v_bt_cb_mar08;

  UPDATE bank_transactions
  SET is_reconciled   = true,
      reconciled_with = v_z_mar09,
      reconciled_at   = now()
  WHERE id = v_bt_cb_mar09;

  UPDATE bank_transactions
  SET is_reconciled   = true,
      reconciled_with = v_z_mar10,
      reconciled_at   = now()
  WHERE id = v_bt_cb_mar10;

  UPDATE bank_transactions
  SET is_reconciled   = true,
      reconciled_with = v_z_mar11,
      reconciled_at   = now()
  WHERE id = v_bt_cb_mar11;

  UPDATE bank_transactions
  SET is_reconciled   = true,
      reconciled_with = v_z_mar12,
      reconciled_at   = now()
  WHERE id = v_bt_cb_mar12;

  UPDATE bank_transactions
  SET is_reconciled   = true,
      reconciled_with = v_z_mar14,
      reconciled_at   = now()
  WHERE id = v_bt_cb_mar14;

  UPDATE bank_transactions
  SET is_reconciled   = true,
      reconciled_with = v_z_mar15,
      reconciled_at   = now()
  WHERE id = v_bt_cb_mar15;

  UPDATE bank_transactions
  SET is_reconciled   = true,
      reconciled_with = v_z_mar17,
      reconciled_at   = now()
  WHERE id = v_bt_cb_mar17;

  UPDATE bank_transactions
  SET is_reconciled   = true,
      reconciled_with = v_z_mar18,
      reconciled_at   = now()
  WHERE id = v_bt_cb_mar18;

  UPDATE bank_transactions
  SET is_reconciled   = true,
      reconciled_with = v_z_mar20,
      reconciled_at   = now()
  WHERE id = v_bt_cb_mar20;

  -- ============================================================
  -- 5. TREASURY ENTRIES — ~50 entries
  -- ============================================================

  -- 5a. Auto-generated from closings (30 income/sales entries)
  INSERT INTO treasury_entries
    (restaurant_id, entry_date, type, category, label, amount,
     source_module, source_id)
  VALUES
    (v_restaurant_id, '2026-03-07', 'income', 'sales', 'CA journée 07/03', 1820.00, 'M08_closing', v_z_mar07),
    (v_restaurant_id, '2026-03-08', 'income', 'sales', 'CA journée 08/03', 2140.00, 'M08_closing', v_z_mar08),
    (v_restaurant_id, '2026-03-09', 'income', 'sales', 'CA journée 09/03',  980.00, 'M08_closing', v_z_mar09),
    (v_restaurant_id, '2026-03-10', 'income', 'sales', 'CA journée 10/03', 1050.00, 'M08_closing', v_z_mar10),
    (v_restaurant_id, '2026-03-11', 'income', 'sales', 'CA journée 11/03', 1120.00, 'M08_closing', v_z_mar11),
    (v_restaurant_id, '2026-03-12', 'income', 'sales', 'CA journée 12/03', 1340.00, 'M08_closing', v_z_mar12),
    (v_restaurant_id, '2026-03-13', 'income', 'sales', 'CA journée 13/03', 1680.00, 'M08_closing', v_z_mar13),
    (v_restaurant_id, '2026-03-14', 'income', 'sales', 'CA journée 14/03', 2320.00, 'M08_closing', v_z_mar14),
    (v_restaurant_id, '2026-03-15', 'income', 'sales', 'CA journée 15/03', 1960.00, 'M08_closing', v_z_mar15),
    (v_restaurant_id, '2026-03-16', 'income', 'sales', 'CA journée 16/03',  870.00, 'M08_closing', v_z_mar16),
    (v_restaurant_id, '2026-03-17', 'income', 'sales', 'CA journée 17/03', 1090.00, 'M08_closing', v_z_mar17),
    (v_restaurant_id, '2026-03-18', 'income', 'sales', 'CA journée 18/03', 1250.00, 'M08_closing', v_z_mar18),
    (v_restaurant_id, '2026-03-19', 'income', 'sales', 'CA journée 19/03', 1450.00, 'M08_closing', v_z_mar19),
    (v_restaurant_id, '2026-03-20', 'income', 'sales', 'CA journée 20/03', 1760.00, 'M08_closing', v_z_mar20),
    (v_restaurant_id, '2026-03-21', 'income', 'sales', 'CA journée 21/03', 2480.00, 'M08_closing', v_z_mar21),
    (v_restaurant_id, '2026-03-22', 'income', 'sales', 'CA journée 22/03', 2050.00, 'M08_closing', v_z_mar22),
    (v_restaurant_id, '2026-03-23', 'income', 'sales', 'CA journée 23/03',  920.00, 'M08_closing', v_z_mar23),
    (v_restaurant_id, '2026-03-24', 'income', 'sales', 'CA journée 24/03', 1100.00, 'M08_closing', v_z_mar24),
    (v_restaurant_id, '2026-03-25', 'income', 'sales', 'CA journée 25/03', 1280.00, 'M08_closing', v_z_mar25),
    (v_restaurant_id, '2026-03-26', 'income', 'sales', 'CA journée 26/03', 1390.00, 'M08_closing', v_z_mar26),
    (v_restaurant_id, '2026-03-27', 'income', 'sales', 'CA journée 27/03', 1850.00, 'M08_closing', v_z_mar27),
    (v_restaurant_id, '2026-03-28', 'income', 'sales', 'CA journée 28/03', 2380.00, 'M08_closing', v_z_mar28),
    (v_restaurant_id, '2026-03-29', 'income', 'sales', 'CA journée 29/03', 1990.00, 'M08_closing', v_z_mar29),
    (v_restaurant_id, '2026-03-30', 'income', 'sales', 'CA journée 30/03',  860.00, 'M08_closing', v_z_mar30),
    (v_restaurant_id, '2026-03-31', 'income', 'sales', 'CA journée 31/03', 1130.00, 'M08_closing', v_z_mar31),
    (v_restaurant_id, '2026-04-01', 'income', 'sales', 'CA journée 01/04', 1170.00, 'M08_closing', v_z_apr01),
    (v_restaurant_id, '2026-04-02', 'income', 'sales', 'CA journée 02/04', 1310.00, 'M08_closing', v_z_apr02),
    (v_restaurant_id, '2026-04-03', 'income', 'sales', 'CA journée 03/04', 1740.00, 'M08_closing', v_z_apr03),
    (v_restaurant_id, '2026-04-04', 'income', 'sales', 'CA journée 04/04', 2260.00, 'M08_closing', v_z_apr04),
    (v_restaurant_id, '2026-04-05', 'income', 'sales', 'CA journée 05/04', 2100.00, 'M08_closing', v_z_apr05);

  -- 5b. Supplier expenses (5 entries, source M05_stock)
  INSERT INTO treasury_entries
    (restaurant_id, entry_date, type, category, label, amount,
     source_module, source_id)
  VALUES
    (v_restaurant_id, '2026-03-05', 'expense', 'supplier',
     'Facture METRO — viandes et produits frais', 1840.00, 'M05_stock', NULL),
    (v_restaurant_id, '2026-03-10', 'expense', 'supplier',
     'Facture TRANSGOURMET — viandes fumées', 2150.00, 'M05_stock', NULL),
    (v_restaurant_id, '2026-03-15', 'expense', 'supplier',
     'Facture SYSCO — boissons et bières', 780.00, 'M05_stock', NULL),
    (v_restaurant_id, '2026-03-22', 'expense', 'supplier',
     'Facture EPISAVEURS — épicerie sèche', 620.00, 'M05_stock', NULL),
    (v_restaurant_id, '2026-03-28', 'expense', 'supplier',
     'Facture FRUITS & LEGUMES SARTHE', 510.00, 'M05_stock', NULL);

  -- 5c. Salary (1 entry, source M07_personnel)
  INSERT INTO treasury_entries
    (restaurant_id, entry_date, type, category, label, amount,
     source_module, source_id)
  VALUES
    (v_restaurant_id, '2026-03-28', 'expense', 'salary',
     'Salaires Mars 2026 — 11 employés', 8120.00, 'M07_personnel', NULL);

  -- 5d. Manual entries (loyer, assurance, investissement, matériel, maintenance)
  INSERT INTO treasury_entries
    (restaurant_id, entry_date, type, category, label, amount,
     source_module, source_id)
  VALUES
    (v_restaurant_id, '2026-03-01', 'expense', 'rent',
     'Loyer Mars 2026 — SCI Les Chênes', 1800.00, NULL, NULL),
    (v_restaurant_id, '2026-03-05', 'expense', 'insurance',
     'Assurance Multirisque Pro — Groupama', 450.00, NULL, NULL),
    (v_restaurant_id, '2026-03-12', 'expense', 'investment',
     'Achat 12 chaises de terrasse', 2400.00, NULL, NULL),
    (v_restaurant_id, '2026-03-18', 'expense', 'equipment',
     'Renouvellement vaisselle service', 380.00, NULL, NULL),
    (v_restaurant_id, '2026-03-25', 'expense', 'maintenance',
     'Entretien et dégraissage hotte cuisine', 250.00, NULL, NULL);

  -- ============================================================
  -- 6. VAT PERIODS
  -- ============================================================

  -- February 2026 — validated
  -- TVA collectée : ~28 jours × 1400€ moyen × taux effectifs
  -- vat_10 = 1400*0.70*(10/110) = 89.09  × 28 = 2494.55
  -- vat_20 = 1400*0.20*(20/120) = 46.67  × 28 = 1306.67
  -- vat_5_5= 1400*0.10*(5.5/105.5) = 7.30 × 28 = 204.35
  -- vat_deductible (achats fournisseurs ~6000€ × 20%) = 1200
  -- vat_due = 2494.55+1306.67+204.35 - 1200 = 2805.57
  INSERT INTO vat_periods
    (restaurant_id, period_start, period_end,
     vat_5_5_collected, vat_10_collected, vat_20_collected,
     vat_deductible, vat_due,
     status, declared_at, notes)
  VALUES (
    v_restaurant_id, '2026-02-01', '2026-02-28',
    204.35, 2494.55, 1306.67,
    1200.00, 2805.57,
    'validated', '2026-03-20 10:15:00+00',
    'Déclaration TVA Février 2026 — validée et transmise'
  );

  -- March 2026 — draft
  -- vat_10 = somme vat_10 des 25 jours de mars = environ 2453€
  -- vat_20 = somme vat_20 des 25 jours de mars = environ 1293€
  -- vat_5_5= somme vat_5_5 des 25 jours = environ 238€
  -- vat_deductible (achats mars ~5900 × 20%) = 1180
  -- vat_due = 2453+1293+238 - 1180 = 2804
  INSERT INTO vat_periods
    (restaurant_id, period_start, period_end,
     vat_5_5_collected, vat_10_collected, vat_20_collected,
     vat_deductible, vat_due,
     status, notes)
  VALUES (
    v_restaurant_id, '2026-03-01', '2026-03-31',
    238.00, 2453.00, 1293.00,
    1180.00, 2804.00,
    'draft',
    'Déclaration TVA Mars 2026 — en cours de préparation'
  );

END $$;
