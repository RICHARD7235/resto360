-- =====================================================================
-- M10 Marketing — Seed La Cabane qui Fume
-- Segments, campagnes, promotions, posts réseaux
-- =====================================================================

DO $$
DECLARE
  v_resto uuid;
  v_seg_all uuid;
  v_seg_vip uuid;
  v_seg_inactive uuid;
BEGIN
  SELECT id INTO v_resto FROM restaurants WHERE name ILIKE '%cabane%' LIMIT 1;
  IF v_resto IS NULL THEN
    RAISE NOTICE 'LCQF restaurant not found, skipping M10 seed';
    RETURN;
  END IF;

  -- ---------- Segments ----------
  INSERT INTO marketing_segments (restaurant_id, name, description, estimated_count)
  VALUES
    (v_resto, 'Tous les clients', 'Ensemble de la base clients inscrits', 1247),
    (v_resto, 'Clients fidèles', 'Plus de 5 visites sur les 6 derniers mois', 186),
    (v_resto, 'Inactifs 30j', 'Aucune visite depuis plus de 30 jours', 432)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_seg_all FROM marketing_segments WHERE restaurant_id = v_resto AND name = 'Tous les clients' LIMIT 1;
  SELECT id INTO v_seg_vip FROM marketing_segments WHERE restaurant_id = v_resto AND name = 'Clients fidèles' LIMIT 1;
  SELECT id INTO v_seg_inactive FROM marketing_segments WHERE restaurant_id = v_resto AND name = 'Inactifs 30j' LIMIT 1;

  -- ---------- Campagnes ----------
  INSERT INTO marketing_campaigns (restaurant_id, name, channel, segment_id, subject, message, status, sent_at, recipients_count, opens_count, clicks_count)
  VALUES
    (v_resto, 'Menu de Pâques 2026', 'email', v_seg_all,
     'Nos spécialités Pâques au fumoir',
     'Cher client, découvrez notre menu spécial Pâques : agneau fumé 12h, côte de boeuf Black Angus et desserts maison. Réservez dès maintenant !',
     'sent', now() - interval '6 days', 1247, 589, 142),
    (v_resto, 'Soirée Ribs à volonté', 'email', v_seg_vip,
     'Exclu fidélité : Ribs à volonté vendredi',
     'En tant que client fidèle, nous vous invitons à notre soirée Ribs à volonté ce vendredi soir. 29€/pers, places limitées.',
     'sent', now() - interval '2 days', 186, 132, 48),
    (v_resto, 'On vous manque ?', 'sms', v_seg_inactive,
     NULL,
     'La Cabane qui Fume : -15% sur votre prochaine visite avec le code RETOUR15. Valable 15 jours.',
     'scheduled', NULL, 432, 0, 0),
    (v_resto, 'Nouveau brunch dominical', 'email', v_seg_all,
     'Brunch BBQ tous les dimanches',
     'Dès le 19 avril, découvrez notre nouveau brunch BBQ dominical : 28€/pers, buffet à volonté, ambiance bluegrass.',
     'draft', NULL, 0, 0, 0);

  UPDATE marketing_campaigns SET scheduled_at = now() + interval '2 days'
  WHERE restaurant_id = v_resto AND status = 'scheduled';

  -- ---------- Promotions ----------
  INSERT INTO marketing_promotions (restaurant_id, code, description, discount_type, discount_value, starts_at, ends_at, max_uses, uses_count, is_active)
  VALUES
    (v_resto, 'RETOUR15', 'Remise clients inactifs', 'percent', 15, CURRENT_DATE, CURRENT_DATE + 15, 500, 23, true),
    (v_resto, 'PAQUES2026', 'Menu Pâques -10%', 'percent', 10, CURRENT_DATE - 3, CURRENT_DATE + 5, NULL, 47, true),
    (v_resto, 'BIENVENUE', 'Offre premier repas', 'amount', 5, CURRENT_DATE - 60, CURRENT_DATE + 365, NULL, 134, true),
    (v_resto, 'NOEL2025', 'Menu fêtes 2025', 'percent', 20, '2025-12-01', '2025-12-31', 200, 187, false)
  ON CONFLICT (restaurant_id, code) DO NOTHING;

  -- ---------- Posts réseaux ----------
  INSERT INTO marketing_social_posts (restaurant_id, platform, content, image_url, scheduled_at, status, published_at)
  VALUES
    (v_resto, 'instagram',
     '🔥 Le brisket du jour sort du fumoir ! 14h de cuisson low & slow, écorce parfaite. Venez le goûter ce midi 🥩 #BBQ #Smokehouse #LaCabaneQuiFume',
     NULL, now() - interval '1 day', 'published', now() - interval '1 day'),
    (v_resto, 'facebook',
     'Ce week-end, soirée bluegrass live avec le groupe Smoky Mountain Boys 🎸 Réservation conseillée !',
     NULL, now() + interval '2 days', 'scheduled', NULL),
    (v_resto, 'instagram',
     'Nouveau : notre brunch BBQ tous les dimanches dès le 19 avril 🥓🍳 Places limitées, réservez vite !',
     NULL, now() + interval '4 days', 'scheduled', NULL),
    (v_resto, 'facebook',
     'Merci à tous pour vos retours sur le menu de Pâques ! ⭐⭐⭐⭐⭐ On prépare déjà la suite 🔥',
     NULL, now() - interval '3 days', 'published', now() - interval '3 days'),
    (v_resto, 'instagram',
     'Teasing : une nouvelle recette arrive la semaine prochaine 👀 Des indices en story !',
     NULL, now() + interval '6 days', 'draft', NULL);

  RAISE NOTICE 'M10 Marketing seed LCQF inserted';
END $$;
