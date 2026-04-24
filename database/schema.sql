
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS likes (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, message_id)
);

CREATE TABLE IF NOT EXISTS messages_archive (
    archive_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    original_id UUID NOT NULL,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    message_created_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    archive_reason VARCHAR(20) DEFAULT 'DELETED'
);

CREATE TABLE IF NOT EXISTS likes_archive (
    user_id UUID NOT NULL,
    message_id UUID NOT NULL,
    liked_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deletion_reason VARCHAR(50) DEFAULT 'MESSAGE_DELETED'
);
CREATE OR REPLACE FUNCTION archive_full_data()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO messages_archive (original_id, user_id, content, message_created_at, archive_reason)
    VALUES (OLD.id, OLD.user_id, OLD.content, OLD.created_at, 'DELETED');
    
    INSERT INTO likes_archive (user_id, message_id, liked_at)
    SELECT user_id, message_id, created_at 
    FROM likes 
    WHERE message_id = OLD.id;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE FUNCTION archive_message_on_update()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO messages_archive (original_id, user_id, content, message_created_at, archive_reason)
    VALUES (OLD.id, OLD.user_id, OLD.content, OLD.created_at, 'EDITED');
    
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trigger_archive_all
BEFORE DELETE ON messages
FOR EACH ROW
EXECUTE FUNCTION archive_full_data();
CREATE TRIGGER trigger_archive_on_update
BEFORE UPDATE ON messages
FOR EACH ROW
WHEN (OLD.content IS DISTINCT FROM NEW.content)
EXECUTE FUNCTION archive_message_on_update();