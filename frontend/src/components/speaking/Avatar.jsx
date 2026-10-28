// frontend/src/components/speaking/Avatar.jsx
import React from 'react';
import { HumanAvatar, EXAMINERS } from './HumanAvatar';

export const Avatar = ({ isSpeaking, isListening, examinerId = 'david', onExaminerChange, audioElement }) => {
  return (
    <HumanAvatar
      isSpeaking={isSpeaking}
      isListening={isListening}
      examinerId={examinerId}
      onExaminerChange={onExaminerChange}
      audioElement={audioElement}
    />
  );
};

export { EXAMINERS };