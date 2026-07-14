-- Migration: fix_rating_history_null_on_first_rating
-- Applied live to Supabase project "joonlovesmusic" (vvnzlxayrqqvoubvcunl) on 2026-07-14.
--
-- Problem:
--   The BEFORE UPDATE trigger `save_rating_and_comment_history` on public.songs
--   logs the PREVIOUS rating into rating_history whenever a rating changes.
--   When rating a previously-unrated song, OLD.rating is NULL — but both
--   rating_history.rating and comment_history.rating are NOT NULL, so the insert
--   failed with:
--     null value in column "rating" of relation "rating_history"
--     violates not-null constraint
--   This blocked setting a rating on any of the ~739 unrated songs (and would
--   have hit the same wall on the comment_history insert for comment edits).
--
-- Fix:
--   Only write a history row when there is a prior rating to record
--   (OLD.rating IS NOT NULL). updated_at is still bumped on every rating change.

CREATE OR REPLACE FUNCTION public.save_rating_and_comment_history()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Save to rating_history if rating changed
    IF NEW.rating IS DISTINCT FROM OLD.rating THEN
        -- Only log a history row when there is a PRIOR rating to record.
        -- A song going unrated -> rated has no previous rating, and
        -- rating_history.rating is NOT NULL, so skip the log in that case.
        IF OLD.rating IS NOT NULL THEN
            INSERT INTO rating_history (song_id, rating, changed_at)
            VALUES (OLD.id, OLD.rating, OLD.updated_at);
        END IF;

        -- Always bump updated_at when the rating changes
        NEW.updated_at = NOW();
    END IF;

    -- Save to comment_history if comment changed
    IF NEW.comment IS DISTINCT FROM OLD.comment THEN
        -- comment_history.rating is also NOT NULL; only log when a rating
        -- exists to attach to the historical comment.
        IF OLD.rating IS NOT NULL THEN
            INSERT INTO comment_history (song_id, comment, rating, changed_at)
            VALUES (OLD.id, OLD.comment, OLD.rating, NOW());
        END IF;
    END IF;

    RETURN NEW;
END;
$function$;
