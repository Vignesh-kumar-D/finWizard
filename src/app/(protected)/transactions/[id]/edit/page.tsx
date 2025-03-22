'use client';
import TransactionForm from '@/components/transaction/TransactionForm';
import { useParams } from 'next/navigation';
import React from 'react';

export default function EditTransactionPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  return (
    <>
      <TransactionForm id={id} />
    </>
  );
}
