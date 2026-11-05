-- Apelido único na turma sem diferenciar maiúsculas ("Ana" e "ana" são o mesmo aluno)
CREATE UNIQUE INDEX participants_name_ci ON participants (classroom_id, lower(display_name));
