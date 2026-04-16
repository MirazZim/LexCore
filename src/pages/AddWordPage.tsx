import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ArrowLeft, X } from 'lucide-react';
import { useAddWord } from '@/hooks/useWords';
import type { Register } from '@/lib/types';

const registers: { value: Register; label: string }[] = [
  { value: 'formal', label: 'Formal' },
  { value: 'casual', label: 'Casual' },
  { value: 'literary', label: 'Literary' },
  { value: 'slang', label: 'Slang' },
];

export default function AddWordPage() {
  const navigate = useNavigate();
  const [word, setWord] = useState('');
  const [definition, setDefinition] = useState('');
  const [exampleSentence, setExampleSentence] = useState('');
  const [collocations, setCollocations] = useState<string[]>([]);
  const [collocationInput, setCollocationInput] = useState('');
  const [register, setRegister] = useState<Register>('formal');
  const addWord = useAddWord();

  const addCollocation = () => {
    const trimmed = collocationInput.trim();
    if (trimmed && !collocations.includes(trimmed)) {
      setCollocations(prev => [...prev, trimmed]);
      setCollocationInput('');
    }
  };

  const removeCollocation = (index: number) => {
    setCollocations(prev => prev.filter((_, i) => i !== index));
  };

  const handleCollocationKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCollocation();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim() || !definition.trim()) return;

    try {
      await addWord.mutateAsync({
        word: word.trim(),
        definition: definition.trim(),
        example_sentence: exampleSentence.trim() || undefined,
        register,
        collocations,
      });
      toast.success(`"${word}" added to your library!`, {
        action: {
          label: 'Go to Library',
          onClick: () => navigate('/library'),
        },
      });
      setWord('');
      setDefinition('');
      setExampleSentence('');
      setCollocations([]);
      setCollocationInput('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save word');
    }
  };

  return (
    <AppLayout>
      <div className="px-4 pt-6 max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="font-display text-2xl font-bold">Add Word</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="word">Word</Label>
              <Input id="word" placeholder="e.g., ephemeral" value={word} onChange={(e) => setWord(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="definition">Definition</Label>
              <Textarea id="definition" placeholder="What does this word mean?" value={definition} onChange={(e) => setDefinition(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="example">Example Sentence (optional)</Label>
              <Textarea id="example" placeholder="Where did you first see this word?" value={exampleSentence} onChange={(e) => setExampleSentence(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="collocations">Collocations (optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="collocations"
                  placeholder="e.g., make an effort"
                  value={collocationInput}
                  onChange={(e) => setCollocationInput(e.target.value)}
                  onKeyDown={handleCollocationKeyDown}
                />
                <Button type="button" variant="secondary" onClick={addCollocation} disabled={!collocationInput.trim()}>
                  Add
                </Button>
              </div>
              {collocations.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {collocations.map((c, i) => (
                    <span key={i} className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm">
                      {c}
                      <button type="button" onClick={() => removeCollocation(i)} className="text-muted-foreground hover:text-foreground">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Register</Label>
              <div className="flex flex-wrap gap-2">
                {registers.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setRegister(r.value)}
                    className={cn(
                      'rounded-full px-4 py-2 text-sm font-medium border transition-all',
                      register === r.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-secondary text-secondary-foreground border-border hover:border-primary/50'
                    )}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full h-12 rounded-2xl font-display font-semibold" disabled={addWord.isPending}>
              {addWord.isPending ? 'Saving...' : 'Save Word'}
            </Button>
          </form>
        </motion.div>
      </div>
    </AppLayout>
  );
}
