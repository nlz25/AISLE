CREATE TABLE package_gc (key TEXT PRIMARY KEY, delete_after INTEGER NOT NULL);
CREATE INDEX package_gc_due ON package_gc(delete_after);
CREATE INDEX tasks_package_key ON tasks(package_key) WHERE package_key IS NOT NULL;
