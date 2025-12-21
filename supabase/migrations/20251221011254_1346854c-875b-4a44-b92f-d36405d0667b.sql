-- Atribuir role admin ao EDMAR NEVES GUIMARAES
INSERT INTO user_roles (user_id, role) 
VALUES ('d351a123-d5fa-43fe-a6e1-2ead36d96d1f', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;