import React, { useState, useCallback } from 'react';

interface CustomerNotesProps {
  customerId: string;
  initialNotes: string;
  onSave?: (notes: string) => Promise<void>;
  isLoading?: boolean;
}

export const CustomerNotes: React.FC<CustomerNotesProps> = ({
  customerId,
  initialNotes,
  onSave,
  isLoading = false,
}) => {
  const [notes, setNotes] = useState(initialNotes);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [hasChanges, setHasChanges] = useState(false);

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newNotes = e.target.value;
    setNotes(newNotes);
    setHasChanges(newNotes !== initialNotes);
    setSaveStatus('idle');
  };

  const handleSave = useCallback(async () => {
    if (!onSave) return;

    setIsSaving(true);
    setSaveStatus('idle');

    try {
      await onSave(notes);
      setSaveStatus('success');
      setHasChanges(false);
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving notes:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  }, [notes, onSave]);

  const handleReset = () => {
    setNotes(initialNotes);
    setHasChanges(false);
    setSaveStatus('idle');
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4 animate-pulse"></div>
        <div className="h-32 bg-gray-100 dark:bg-slate-800 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Internal Notes</h2>
        {saveStatus === 'success' && (
          <span className="text-sm text-green-600 font-semibold flex items-center">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Saved
          </span>
        )}
        {saveStatus === 'error' && (
          <span className="text-sm text-red-600 font-semibold flex items-center">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Error saving
          </span>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
          Add or edit notes about this customer (visible only to barbers)
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={handleNotesChange}
          disabled={isSaving}
          placeholder="Enter internal notes here... e.g., preferred cutting style, frequent requests, behavioral notes, etc."
          className="w-full h-32 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-50 dark:bg-slate-900 disabled:text-gray-500"
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {notes.length} characters
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            disabled={!hasChanges || isSaving}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 dark:text-slate-300 font-medium hover:bg-gray-50 dark:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving || !onSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              'Save Notes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
