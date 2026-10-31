import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationItem } from '../NotificationItem';
import { Notification } from '../../types';

describe('NotificationItem Component', () => {
  const mockNotification: Notification = {
    id: 'notif_event_spring_boot',
    title: 'New Event: Spring Boot',
    message: 'A new event "Spring Boot" has been published. Click to view details and register!',
    type: 'EVENT',
    status: 'UNREAD',
    isRead: false,
    link: '/events/spring-boot',
    createdAt: '2026-10-31T10:00:00.000Z',
  };

  it('renders notification title, message, badge and date', () => {
    const onClick = vi.fn();
    render(<NotificationItem notification={mockNotification} onClick={onClick} />);

    expect(screen.getByText('New Event: Spring Boot')).toBeInTheDocument();
    expect(
      screen.getByText('A new event "Spring Boot" has been published. Click to view details and register!'),
    ).toBeInTheDocument();
    expect(screen.getByText('EVENT')).toBeInTheDocument();
  });

  it('renders delete button when onDelete is provided and triggers deletion without firing onClick', () => {
    const onClick = vi.fn();
    const onDelete = vi.fn();

    render(<NotificationItem notification={mockNotification} onClick={onClick} onDelete={onDelete} />);

    const deleteBtn = screen.getByRole('button', { name: /delete notification: new event: spring boot/i });
    expect(deleteBtn).toBeInTheDocument();

    fireEvent.click(deleteBtn);

    expect(onDelete).toHaveBeenCalledWith('notif_event_spring_boot');
    expect(onClick).not.toHaveBeenCalled();
  });

  it('calls onClick when clicking the notification body', () => {
    const onClick = vi.fn();
    const onDelete = vi.fn();

    render(<NotificationItem notification={mockNotification} onClick={onClick} onDelete={onDelete} />);

    const card = screen.getByRole('button', { name: /unread notification: new event: spring boot/i });
    fireEvent.click(card);

    expect(onClick).toHaveBeenCalledWith(mockNotification);
    expect(onDelete).not.toHaveBeenCalled();
  });
});
