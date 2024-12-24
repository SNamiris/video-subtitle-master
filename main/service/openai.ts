import OpenAI, { AzureOpenAI } from "openai";
import { renderTemplate } from '../helpers/utils';

type OpenAIProvider = {
  id: string;
  apiUrl: string;
  apiKey: string;
  modelName?: string;
  prompt?: string;
};

export async function translateWithOpenAI(
  text: string,
  provider: OpenAIProvider,
  sourceLanguage: string,
  targetLanguage: string
) {
  let openai;
  
  if (provider.id === 'azure') {
    // 处理Azure OpenAI的endpoint URL
    const url = new URL(provider.apiUrl);
    const pathParts = url.pathname.split('/');
    const deploymentName = pathParts[pathParts.indexOf('deployments') + 1];
    const apiVersion = url.searchParams.get('api-version') || '2023-05-15'; // 添加默认API版本
    const baseURL = `${url.protocol}//${url.host}/`;

    openai = new AzureOpenAI({
      endpoint: baseURL,
      apiKey: provider.apiKey,
      deployment: deploymentName,
      apiVersion: apiVersion, // 显式设置apiVersion
    });
  } else {
    openai = new OpenAI({
      baseURL: provider.apiUrl,
      apiKey: provider.apiKey,
    });
  }

  // 添加每分钟请求次数
  const REQUEST_PER_MINUTE = 15; // RPM
  const REQUEST_RETURN_INTERVAL = 1500; // LLM返回时间
  let min_request_interval = 60000 / REQUEST_PER_MINUTE;

  let retryCount = 0;
  const MAX_RETRIES = 2; // 最多重试2次，即总共尝试3次

  while (retryCount <= MAX_RETRIES) {
    try {
      const delayTime = Math.max(0, min_request_interval - REQUEST_RETURN_INTERVAL);
      await new Promise(resolve => setTimeout(resolve, delayTime));  

      const systemPrompt = provider.prompt
        ? renderTemplate(provider.prompt, { sourceLanguage, targetLanguage, content: text })
        : `You are a professional, authentic machine translation engine.`;

      const userPrompt = `Translate the following text from ${sourceLanguage} to ${targetLanguage}: "${text}". Don't say anything else.`;

      const completion = await openai.chat.completions.create({
        model: provider.id === 'azure' ? undefined : (provider.modelName || "gpt-3.5-turbo"),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
      });

      const result = completion?.choices?.[0]?.message?.content?.trim();

      console.log('OpenAI Prompt & Result:', {
        prompt: {
          systemPrompt: systemPrompt,
          userPrompt: userPrompt
        },
        result
      });

      retryCount = 0;

      return result;
    } catch (error) {
      console.error(`OpenAI translation error (attempt ${retryCount + 1}):`, error);
      
      if (retryCount < MAX_RETRIES) {
        console.log('等待60秒后重试...');
        await new Promise(resolve => setTimeout(resolve, 60000));
        retryCount++;
      } else {
        throw new Error(`OpenAI translation failed after ${MAX_RETRIES + 1} attempts: ${error.message}`);
      }
    }
  }
}

export default translateWithOpenAI;