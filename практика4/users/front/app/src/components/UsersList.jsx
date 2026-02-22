import React from "react";
import UserItem from "./UserItem";

export default function UsersList({ users, onEdit, onDelete }) {
    if (!users.length) {
        return <div className="empty">Пользователей пока нет</div>;
    }
    return (
        <div className="list">
            {users.map((u) => (
                <UserItem key={u.id} user={u} onEdit={onEdit} onDelete=
                {onDelete} />
            ))}
        </div>
    );
}