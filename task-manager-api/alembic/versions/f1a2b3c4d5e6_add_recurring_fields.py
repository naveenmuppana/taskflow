"""add_recurring_fields

Revision ID: f1a2b3c4d5e6
Revises: e89f1a2b3c4d
Create Date: 2026-08-03 05:40:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'e89f1a2b3c4d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # add column for is_recurring
    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.add_column(sa.Column('is_recurring', sa.Boolean(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('recurrence_rule', sa.String(length=50), nullable=True))

def downgrade() -> None:
    # remove column is_recurring
    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.drop_column('is_recurring')
        batch_op.drop_column('recurrence_rule')
