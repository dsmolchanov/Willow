import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Check } from 'lucide-react';

const OnboardingForm = () => {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({
    learning_style: '',
    experience_level: '',
    professional_role: '',
    industry: '',
    language_proficiency: { EN: '' },
    communication_style: '',
    goals: []
  });

  const steps = [
    {
      title: 'Learning Style',
      field: 'learning_style',
      options: [
        { value: 'Visual', label: 'Visual (seeing)' },
        { value: 'Auditory', label: 'Auditory (listening)' },
        { value: 'Reading/Writing', label: 'Reading/Writing' },
        { value: 'Kinesthetic', label: 'Kinesthetic (doing)' },
        { value: 'Multimodal', label: 'Multimodal (combination)' }
      ]
    },
    {
      title: 'Experience Level',
      field: 'experience_level',
      options: [
        { value: 'Beginner', label: 'Beginner' },
        { value: 'Intermediate', label: 'Intermediate' },
        { value: 'Advanced', label: 'Advanced' },
        { value: 'Expert', label: 'Expert' }
      ]
    },
    {
      title: 'Professional Role',
      field: 'professional_role',
      options: [
        { value: 'Individual_Contributor', label: 'Individual Contributor' },
        { value: 'Team_Lead', label: 'Team Lead' },
        { value: 'Manager', label: 'Manager' },
        { value: 'Director', label: 'Director' },
        { value: 'Executive', label: 'Executive' },
        { value: 'Other', label: 'Other' }
      ]
    },
    {
      title: 'Industry',
      field: 'industry',
      options: [
        { value: 'Technology', label: 'Technology' },
        { value: 'Healthcare', label: 'Healthcare' },
        { value: 'Finance', label: 'Finance' },
        { value: 'Education', label: 'Education' },
        { value: 'Manufacturing', label: 'Manufacturing' },
        { value: 'Retail', label: 'Retail' },
        { value: 'Government', label: 'Government' },
        { value: 'Other', label: 'Other' }
      ]
    },
    {
      title: 'Language Proficiency',
      field: 'language_proficiency',
      options: [
        { value: 'Basic', label: 'Basic' },
        { value: 'Intermediate', label: 'Intermediate' },
        { value: 'Fluent', label: 'Fluent' },
        { value: 'Native', label: 'Native' }
      ]
    },
    {
      title: 'Communication Style',
      field: 'communication_style',
      options: [
        { value: 'Direct', label: 'Direct and straightforward' },
        { value: 'Indirect', label: 'Indirect and nuanced' },
        { value: 'Formal', label: 'Formal and professional' },
        { value: 'Casual', label: 'Casual and relaxed' }
      ]
    },
    {
      title: 'Goals',
      field: 'goals',
      isMulti: true,
      options: [
        { value: 'Skill_Development', label: 'Skill Development' },
        { value: 'Career_Advancement', label: 'Career Advancement' },
        { value: 'Performance_Improvement', label: 'Performance Improvement' },
        { value: 'Certification', label: 'Certification Preparation' },
        { value: 'Personal_Interest', label: 'Personal Interest' }
      ]
    }
  ];

  const handleSelect = (value) => {
    const currentStep = steps[step];
    if (currentStep.isMulti) {
      setFormData(prev => ({
        ...prev,
        [currentStep.field]: prev[currentStep.field].includes(value)
          ? prev[currentStep.field].filter(item => item !== value)
          : [...prev[currentStep.field], value]
      }));
    } else if (currentStep.field === 'language_proficiency') {
      setFormData(prev => ({
        ...prev,
        language_proficiency: { EN: value }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [currentStep.field]: value
      }));
    }
  };

  const handleNext = () => {
    if (step === steps.length - 1) {
      // Save data to database
      console.log('Final form data:', formData);
      window.location.href = `${process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL}`;
    } else {
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const isStepComplete = () => {
    const currentStep = steps[step];
    if (currentStep.isMulti) {
      return formData[currentStep.field].length > 0;
    }
    if (currentStep.field === 'language_proficiency') {
      return formData.language_proficiency.EN !== '';
    }
    return formData[currentStep.field] !== '';
  };

  const currentStep = steps[step];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>{currentStep.title}</CardTitle>
          <div className="flex gap-2 mt-4">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 flex-1 rounded-full ${
                  index <= step ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {currentStep.isMulti ? (
            <div className="space-y-4">
              {currentStep.options.map((option) => (
                <div
                  key={option.value}
                  className={`p-4 border rounded-lg cursor-pointer flex items-center justify-between ${
                    formData[currentStep.field].includes(option.value)
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200'
                  }`}
                  onClick={() => handleSelect(option.value)}
                >
                  <span>{option.label}</span>
                  {formData[currentStep.field].includes(option.value) && (
                    <Check className="h-5 w-5 text-blue-600" />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Select
              value={
                currentStep.field === 'language_proficiency'
                  ? formData.language_proficiency.EN
                  : formData[currentStep.field]
              }
              onValueChange={handleSelect}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={`Select your ${currentStep.title.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {currentStep.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 0}
          >
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!isStepComplete()}
          >
            {step === steps.length - 1 ? 'Complete' : 'Next'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default OnboardingForm;