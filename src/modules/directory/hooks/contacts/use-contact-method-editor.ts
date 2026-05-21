import { useState } from 'react';

import {
  EMAIL_LABEL_OPTIONS,
  PHONE_LABEL_OPTIONS,
} from '@/modules/directory/constants/contacts/contact-detail.constants';
import {
  useAddEmailMutation,
  useAddPhoneMutation,
  useRemoveEmailMutation,
  useRemovePhoneMutation,
} from '@/modules/directory/hooks/contacts.hooks';
import {
  contactEmailSchema,
  contactPhoneInputSchema,
} from '@/modules/directory/schemas/contact.schema';
import { toast } from 'sonner';

export function useContactMethodEditor(contactId: string | undefined) {
  const addPhoneMutation = useAddPhoneMutation();
  const removePhoneMutation = useRemovePhoneMutation();
  const addEmailMutation = useAddEmailMutation();
  const removeEmailMutation = useRemoveEmailMutation();

  const [showAddPhone, setShowAddPhone] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newPhoneLabel, setNewPhoneLabel] = useState(PHONE_LABEL_OPTIONS[0].value);
  const [addPhoneConfirmOpen, setAddPhoneConfirmOpen] = useState(false);
  const [addPhoneError, setAddPhoneError] = useState('');

  const [showAddEmail, setShowAddEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newEmailLabel, setNewEmailLabel] = useState(EMAIL_LABEL_OPTIONS[0].value);
  const [addEmailConfirmOpen, setAddEmailConfirmOpen] = useState(false);
  const [addEmailError, setAddEmailError] = useState('');

  const [removePhoneConfirm, setRemovePhoneConfirm] = useState(false);
  const [removeEmailConfirm, setRemoveEmailConfirm] = useState(false);

  const validateAndSubmitPhone = () => {
    const result = contactPhoneInputSchema.safeParse({
      number: newPhone.trim(),
      label: newPhoneLabel,
    });
    if (!result.success) {
      const message = result.error.issues[0]?.message ?? 'Enter a valid phone number.';
      setAddPhoneError(message);
      toast.error('Please complete the required fields.', {
        description: message,
      });
      return;
    }
    setAddPhoneError('');
    setAddPhoneConfirmOpen(true);
  };

  const validateAndSubmitEmail = () => {
    const result = contactEmailSchema.safeParse({
      email: newEmail.trim(),
      label: newEmailLabel,
    });
    if (!result.success) {
      const message = 'Enter a valid email address.';
      setAddEmailError(message);
      toast.error('Please complete the required fields.', {
        description: message,
      });
      return;
    }
    setAddEmailError('');
    setAddEmailConfirmOpen(true);
  };

  const handleAddPhone = () => {
    if (!contactId || !newPhone.trim()) return;
    addPhoneMutation.mutate(
      { id: contactId, phone: { number: newPhone.trim(), label: newPhoneLabel } },
      {
        onSuccess: () => {
          setNewPhone('');
          setNewPhoneLabel(PHONE_LABEL_OPTIONS[0].value);
          setShowAddPhone(false);
          setAddPhoneConfirmOpen(false);
          toast.success('Phone number added.');
        },
      }
    );
  };

  const handleAddEmail = () => {
    if (!contactId || !newEmail.trim()) return;
    addEmailMutation.mutate(
      { id: contactId, email: { email: newEmail.trim(), label: newEmailLabel } },
      {
        onSuccess: () => {
          setNewEmail('');
          setNewEmailLabel(EMAIL_LABEL_OPTIONS[0].value);
          setShowAddEmail(false);
          setAddEmailConfirmOpen(false);
          toast.success('Email address added.');
        },
      }
    );
  };

  const handleRemovePhone = () => {
    if (!contactId) return;
    removePhoneMutation.mutate(contactId, {
      onSuccess: () => {
        setRemovePhoneConfirm(false);
        toast.success('Phone number removed.');
      },
    });
  };

  const handleRemoveEmail = () => {
    if (!contactId) return;
    removeEmailMutation.mutate(contactId, {
      onSuccess: () => {
        setRemoveEmailConfirm(false);
        toast.success('Email address removed.');
      },
    });
  };

  return {
    showAddPhone,
    setShowAddPhone,
    newPhone,
    setNewPhone,
    newPhoneLabel,
    setNewPhoneLabel,
    addPhoneConfirmOpen,
    setAddPhoneConfirmOpen,
    addPhoneError,
    setAddPhoneError,
    showAddEmail,
    setShowAddEmail,
    newEmail,
    setNewEmail,
    newEmailLabel,
    setNewEmailLabel,
    addEmailConfirmOpen,
    setAddEmailConfirmOpen,
    addEmailError,
    setAddEmailError,
    removePhoneConfirm,
    setRemovePhoneConfirm,
    removeEmailConfirm,
    setRemoveEmailConfirm,
    isAddingPhone: addPhoneMutation.isPending,
    isRemovingPhone: removePhoneMutation.isPending,
    isAddingEmail: addEmailMutation.isPending,
    isRemovingEmail: removeEmailMutation.isPending,
    validateAndSubmitPhone,
    validateAndSubmitEmail,
    handleAddPhone,
    handleAddEmail,
    handleRemovePhone,
    handleRemoveEmail,
  };
}

export type ContactMethodEditor = ReturnType<typeof useContactMethodEditor>;
