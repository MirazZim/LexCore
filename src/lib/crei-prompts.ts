// Static bank of real IELTS Task 2 essay titles for the Writing Lab (CREI drill).
// These are fixed, curated prompts — the model no longer generates the topic
// itself, only the per-prompt examiner tip in generateCREIPrompt().

import type { CREIDomain, CREIQuestionType } from './llm';

export interface CREIPromptFixture {
  prompt: string;
  questionType: CREIQuestionType;
  domain: CREIDomain;
}

export const CREI_PROMPT_BANK: CREIPromptFixture[] = [
  {
    prompt: `Some people think that parents should teach their children how to be good members of society. Others, however, believe that school is the best place to learn this. Discuss both views and give your own opinion.`,
    questionType: 'discussion',
    domain: 'education',
  },
  {
    prompt: `There is an increasing trend around the world of married couples deciding not to have children. Discuss the advantages and disadvantages for couples who decide to do this.`,
    questionType: 'two-part',
    domain: 'society',
  },
  {
    prompt: `In many professional sports, there is an increase in the number of athletes using banned substances to improve their performance. What are the causes of the phenomenon and what are some of the possible solutions?`,
    questionType: 'problem-solution',
    domain: 'health',
  },
  {
    prompt: `Details of politicians' private lives should not be published in newspapers. To what extent do you agree or disagree?`,
    questionType: 'opinion',
    domain: 'society',
  },
  {
    prompt: `Some say that music, art and drama are as important as other school subjects, especially at the primary level. Do you agree or disagree?`,
    questionType: 'opinion',
    domain: 'education',
  },
  {
    prompt: `Some people think that all university students should study whatever they like. Others believe that they should only be allowed to study subjects that will be useful in the future, such as those related to science and technology. Discuss both these views and give your own opinion.`,
    questionType: 'discussion',
    domain: 'education',
  },
  {
    prompt: `In some countries, younger people are neglecting their right to vote. What problems does this cause and what are some of the possible solutions?`,
    questionType: 'problem-solution',
    domain: 'society',
  },
  {
    prompt: `Some people say that the best way to improve public health is by increasing the number of sports facilities. Others, however, say that this would have little effect on public health and that other measures are required. Discuss both these views and give your own opinion.`,
    questionType: 'discussion',
    domain: 'health',
  },
  {
    prompt: `Some people think that it is better to educate boys and girls in separate schools. Others, however, believe that boys and girls benefit more from attending mixed schools. Discuss both these views and give your own opinion.`,
    questionType: 'discussion',
    domain: 'education',
  },
  {
    prompt: `Being a celebrity, such as a famous film star or sports personality, brings problems as well as benefits. Do you think that being a celebrity brings more benefits or more problems?`,
    questionType: 'opinion',
    domain: 'society',
  },
  {
    prompt: `Multinational companies are becoming increasingly common in developing countries. What are the advantages and disadvantages of this?`,
    questionType: 'two-part',
    domain: 'work',
  },
  {
    prompt: `Some people say that television is useful for education, while others say it is useful only for entertainment. Discuss both views and give your own opinion.`,
    questionType: 'discussion',
    domain: 'technology',
  },
  {
    prompt: `In many countries, the government prioritises economic growth above all other concerns. Discuss the advantages and disadvantages of this.`,
    questionType: 'two-part',
    domain: 'society',
  },
  {
    prompt: `In some countries, even though the rates of serious crimes are decreasing, people feel less safe than ever before. What do you think are the causes of this problem and what measures could be taken to solve it?`,
    questionType: 'problem-solution',
    domain: 'society',
  },
  {
    prompt: `Most high-level positions in companies are filled by men even though the workforce in many developed countries is more than 50 per cent female. Companies should be required to allocate a certain percentage of these positions to women. To what extent do you agree?`,
    questionType: 'opinion',
    domain: 'work',
  },
  {
    prompt: `Some people think that the teenage years are the happiest time of most people's lives. Others think that adult life brings more happiness, in spite of greater responsibility. Discuss both views and give your own opinion.`,
    questionType: 'discussion',
    domain: 'society',
  },
  {
    prompt: `In some countries, it is becoming increasingly common for people to follow a vegetarian diet. Do the advantages of this outweigh the disadvantages?`,
    questionType: 'two-part',
    domain: 'health',
  },
  {
    prompt: `In modern times, children are spending less time with their families and more time with their friends. Why has this change occurred? Do you think parents should force their children to spend more time at home?`,
    questionType: 'two-part',
    domain: 'society',
  },
  {
    prompt: `It is generally believed that some people are born with certain talents, for instance for sport or music, and others are not. However, it is sometimes claimed that any child can be taught to become a good sports person or musician. Discuss both these views and give your own opinion.`,
    questionType: 'discussion',
    domain: 'education',
  },
  {
    prompt: `Nowadays more and more people have to compete with young people for the same jobs. What problems does this cause? What are some possible solutions?`,
    questionType: 'problem-solution',
    domain: 'work',
  },
  {
    prompt: `Some companies have uniforms for their staff which must be worn at all times. Discuss the advantages and disadvantages of this.`,
    questionType: 'two-part',
    domain: 'work',
  },
  {
    prompt: `Nowadays the way many people interact with each other has changed because of technology. In what ways has technology affected the types of relationships people make? Is this a positive or negative development?`,
    questionType: 'two-part',
    domain: 'technology',
  },
  {
    prompt: `Today people are travelling more than ever before. Why is this the case? What are the benefits of travelling for the traveller?`,
    questionType: 'two-part',
    domain: 'society',
  },
  {
    prompt: `Some people prefer to live in a house, while others feel that there are more advantages to living in an apartment. Are there more advantages than disadvantages of living in a house compared with living in an apartment?`,
    questionType: 'opinion',
    domain: 'urban planning',
  },
  {
    prompt: `Many people are now opting to provide technology companies with their personal data in exchange for access to software. Do the advantages of this outweigh the disadvantages?`,
    questionType: 'two-part',
    domain: 'technology',
  },
  {
    prompt: `In recent years, there has been a rise in the popularity of second-hand clothing amongst the younger generation. Why is this happening? Do you think it's a positive or negative development?`,
    questionType: 'two-part',
    domain: 'environment',
  },
];
