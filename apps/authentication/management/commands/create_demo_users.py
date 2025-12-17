"""
Management command to create demo users for WiseBook.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Create demo users for WiseBook development'

    def handle(self, *args, **options):
        demo_users = [
            {
                'username': 'admin',
                'email': 'admin@wisebook.com',
                'password': 'admin123',
                'first_name': 'Admin',
                'last_name': 'WiseBook',
                'is_staff': True,
                'is_superuser': True,
            },
            {
                'username': 'manager',
                'email': 'manager@wisebook.com',
                'password': 'manager123',
                'first_name': 'Manager',
                'last_name': 'WiseBook',
                'is_staff': True,
                'is_superuser': False,
            },
            {
                'username': 'comptable',
                'email': 'comptable@wisebook.com',
                'password': 'comptable123',
                'first_name': 'Comptable',
                'last_name': 'WiseBook',
                'is_staff': False,
                'is_superuser': False,
            },
        ]

        for user_data in demo_users:
            password = user_data.pop('password')
            email = user_data['email']

            user, created = User.objects.get_or_create(
                email=email,
                defaults=user_data
            )

            if created:
                user.set_password(password)
                user.save()
                self.stdout.write(
                    self.style.SUCCESS(f'Created user: {email}')
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f'User already exists: {email}')
                )

        self.stdout.write(self.style.SUCCESS('\nDemo users created successfully!'))
        self.stdout.write('\nYou can now login with:')
        self.stdout.write('  - admin@wisebook.com / admin123 (Admin)')
        self.stdout.write('  - manager@wisebook.com / manager123 (Manager)')
        self.stdout.write('  - comptable@wisebook.com / comptable123 (Comptable)')
