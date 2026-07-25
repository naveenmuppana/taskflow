"""cleanup_unused_tables_add_indexes_and_token_version

Revision ID: e89f1a2b3c4d
Revises: b562c62ee749
Create Date: 2026-07-25 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e89f1a2b3c4d'
down_revision: Union[str, Sequence[str], None] = 'b562c62ee749'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add token_version to users table
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.add_column(sa.Column('token_version', sa.Integer(), server_default='1', nullable=False))

    # 2. Create composite indexes on tasks
    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.create_index('ix_tasks_owner_id_is_archived', ['owner_id', 'is_archived'], unique=False)
        batch_op.create_index('ix_tasks_owner_id_status', ['owner_id', 'status'], unique=False)

    # 3. Create composite index on subtasks
    with op.batch_alter_table('subtasks', schema=None) as batch_op:
        batch_op.create_index('ix_subtasks_task_id_owner_id', ['task_id', 'owner_id'], unique=False)

    # 4. Drop unused tables (time_entries and task_dependencies)
    with op.batch_alter_table('time_entries', schema=None) as batch_op:
        batch_op.drop_index('ix_time_entries_task_id')
        batch_op.drop_index('ix_time_entries_id')
    op.drop_table('time_entries')
    op.drop_table('task_dependencies')


def downgrade() -> None:
    # Recreate task_dependencies and time_entries
    op.create_table('task_dependencies',
        sa.Column('task_id', sa.Integer(), nullable=False),
        sa.Column('depends_on_task_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['depends_on_task_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('task_id', 'depends_on_task_id')
    )
    op.create_table('time_entries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('task_id', sa.Integer(), nullable=False),
        sa.Column('start_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('duration_seconds', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('time_entries', schema=None) as batch_op:
        batch_op.create_index('ix_time_entries_id', ['id'], unique=False)
        batch_op.create_index('ix_time_entries_task_id', ['task_id'], unique=False)

    # Drop composite indexes
    with op.batch_alter_table('subtasks', schema=None) as batch_op:
        batch_op.drop_index('ix_subtasks_task_id_owner_id')

    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.drop_index('ix_tasks_owner_id_status')
        batch_op.drop_index('ix_tasks_owner_id_is_archived')

    # Drop token_version from users table
    with op.batch_alter_table('users', schema=None) as batch_op:
        batch_op.drop_column('token_version')
