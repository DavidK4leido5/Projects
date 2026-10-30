create or replace function spendwise.notify_notification_insert()
returns trigger
language plpgsql
as $$
begin
  perform pg_notify(
    'spendwise_notifications',
    json_build_object('id', new.id, 'userId', new.user_id)::text
  );
  return new;
end;
$$;
--> statement-breakpoint
drop trigger if exists notification_insert_notify on spendwise.notifications;
--> statement-breakpoint
create trigger notification_insert_notify
after insert on spendwise.notifications
for each row execute function spendwise.notify_notification_insert();
