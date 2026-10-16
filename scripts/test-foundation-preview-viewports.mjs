import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import { build } from "esbuild";
import { chromium } from "@playwright/test";
const root = process.cwd();
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "foundation-preview-qa-"));
const out = path.resolve(
  root,
  process.env.FOUNDATION_QA_OUTPUT_DIR || "artifacts/phase-two-preview-matrix"
);
await fs.mkdir(out, { recursive: true });
const stub = path.join(temp, "trpc-stub.js");
await fs.writeFile(
  stub,
  `const parts=['Leia','Entenda','Responda','Aplique'].map((title,position)=>({id:position+1,studyId:7,churchId:1,title,content:'Original '+title,position,active:true,reflectionPrompt:'Reflexão '+title})); const empty=[]; const invalidate={invalidate:()=>Promise.resolve()}; const utils=new Proxy({}, {get:()=>invalidate}); export const trpc={useUtils:()=>({escolaFundamentos:utils}), escolaFundamentos:new Proxy({}, {get:(_,name)=>({useQuery:()=>({data:name==='listQuestionBlocks'?parts:empty,isLoading:false}),useMutation:()=>({isPending:false,mutate:()=>{throw Error('MUTATION_NAO_PERMITIDA_NA_FIXTURE')}})})})};`
);
const jsx = `import React,{useState} from 'react'; import {createRoot} from 'react-dom/client'; import {PreviewPane,FoundationStudyEditor} from '${root}/client/src/pages/foundation/FoundationStudyEditor'; import {StudyTrailItem} from '${root}/client/src/pages/foundation/StudyTrailItem'; import {StudentStageNotes} from '${root}/client/src/pages/foundation/StudentLearningExperience';
const steps=['Leia','Entenda','Responda','Aplique'];
function Harness(){const [index,setIndex]=useState(0);const [show,setShow]=useState(false); const [editor,setEditor]=useState(false); const blocks=steps.map((title,i)=>({id:i+1,title,content:'Conteúdo sintético '+title,position:i,active:true,reflectionPrompt:i===1?null:'Reflexão sintética '+title})); const block=blocks[index]; const questions=[{block:{id:3},question:{id:9,prompt:'Qual atitude constrói?',options:[{id:'a',label:'Encorajar'},{id:'b',label:'Destruir'}],correctOptionId:'a',explanation:'EXPLICAÇÃO APÓS TENTATIVA'}}]; const props={title:'Estudo sintético de QA',summary:'Exemplo preenchido',content:'Introdução preservada',block,questions,primaryColor:'#1e3a5f',secondaryColor:'#c9a84c'}; return <div className='p-4 space-y-4'><StudentStageNotes stageTitle='Leia de QA' value='Anotação sintética de largura' onChange={()=>{}} primaryColor='#1e3a5f' hasError/><button className='border rounded p-2' onClick={()=>setEditor(true)}>Abrir editor real</button>{editor&&<FoundationStudyEditor open study={{id:7,courseId:1,moduleId:null,title:'Estudo sintético',weekStart:'2026-10-16',content:'Introdução',active:false}} churchId={1} courses={[{id:1,name:'Turma sintética'}]} modules={[]} primaryColor='#1e3a5f' secondaryColor='#c9a84c' onOpenChange={setEditor} onSaved={()=>{}}/>}<StudyTrailItem churchId={1} study={{id:100,courseId:1,title:'Palavras que constroem relações e fortalecem a fé',weekStart:'2026-10-16',summary:'Conteúdo sintético de validação responsiva',active:true}} canManage order={1} actions={<><button className='border rounded p-2'>Editar estudo</button><button className='border rounded p-2'>Retirar da publicação</button><button className='border rounded p-2'>↑</button><button className='border rounded p-2'>↓</button></>}/><nav className='flex flex-wrap gap-2'>{steps.map((s,i)=><button key={s} className='border rounded p-2' onClick={()=>setIndex(i)}>{s}</button>)}</nav><button className='border rounded p-2' onClick={()=>setShow(true)}>Visualizar como aluno</button><PreviewPane {...props}/>{show&&<PreviewPane {...props} modal onClose={()=>setShow(false)}/>}</div>};createRoot(document.getElementById('root')).render(<Harness/>);`;
await build({
  stdin: { contents: jsx, resolveDir: root, loader: "tsx" },
  bundle: true,
  outfile: path.join(temp, "app.js"),
  platform: "browser",
  format: "iife",
  jsx: "automatic",
  alias: {
    "@": path.join(root, "client/src"),
    "@shared": path.join(root, "shared"),
  },
  define: { "import.meta.env": "{}" },
  plugins: [
    {
      name: "isolated-query-fixture",
      setup(b) {
        b.onResolve({ filter: /^@\/lib\/trpc$/ }, () => ({ path: stub }));
      },
    },
  ],
  logLevel: "silent",
});
const assets = await fs.readdir(path.join(root, "dist/public/assets"));
const css = await fs.readFile(
  path.join(
    root,
    "dist/public/assets",
    assets.find(f => f.startsWith("index-") && f.endsWith(".css"))
  )
);
const js = await fs.readFile(path.join(temp, "app.js"));
const server = http.createServer((req, res) => {
  if (req.url === "/app.js") {
    res.setHeader("content-type", "text/javascript");
    res.end(js);
  } else if (req.url === "/style.css") {
    res.setHeader("content-type", "text/css");
    res.end(css);
  } else {
    res.setHeader("content-type", "text/html");
    res.end(
      '<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><body><div id="root"></div><script src="/app.js"></script></body></html>'
    );
  }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const url = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const [width, height] of [
    [375, 812],
    [390, 844],
    [768, 1024],
    [1280, 800],
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    page.setDefaultTimeout(7000);
    let writes = 0;
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.route("**/*", r => {
      const req = r.request();
      if (req.method() !== "GET") {
        writes++;
        return r.abort();
      }
      if (!req.url().startsWith(url)) return r.abort();
      return r.continue();
    });
    await page.goto(url);
    await page
      .getByRole("heading", { name: "Estudo sintético de QA" })
      .waitFor();
    const noteFits = await page
      .getByLabel("Minha anotação em Leia de QA")
      .evaluate(el => {
        const card = el.closest("section");
        const style = getComputedStyle(card);
        const available =
          card.clientWidth -
          parseFloat(style.paddingLeft) -
          parseFloat(style.paddingRight);
        return el.getBoundingClientRect().width >= available - 2;
      });
    if (!noteFits) throw Error("ANOTACAO_ESTREITA");
    await page
      .getByLabel("Minha anotação em Leia de QA")
      .locator("..")
      .screenshot({ path: path.join(out, `anotacao-${width}.png`) });
    const cases = [];
    for (const stage of ["Leia", "Entenda", "Responda", "Aplique"]) {
      await page.getByRole("button", { name: stage, exact: true }).click();
      const field = page.getByLabel(`Minha anotação em ${stage}`, {
        exact: true,
      });
      await field.fill("Nota sintética " + stage);
      if (
        stage === "Entenda" &&
        (await page.getByText("Para refletir", { exact: true }).count())
      )
        throw Error("PROMPT_VAZIO_VISIVEL");
      if (stage === "Responda") {
        if (
          await page
            .getByText("EXPLICAÇÃO APÓS TENTATIVA", { exact: true })
            .count()
        )
          throw Error("GABARITO_ANTECIPADO");
        await page
          .getByRole("button", { name: "Encorajar", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Conferir resposta", exact: true })
          .click();
        await page
          .getByText("EXPLICAÇÃO APÓS TENTATIVA", { exact: true })
          .waitFor();
      }
      await page
        .getByRole("button", { name: "Visualizar como aluno", exact: true })
        .click();
      const modal = page.getByRole("dialog");
      await modal.waitFor();
      await modal
        .getByLabel(`Minha anotação em ${stage}`, { exact: true })
        .fill("Anotação descartável");
      const size = await modal.boundingBox();
      if (size.width > width + 1) throw Error("OVERFLOW_MODAL");
      await modal
        .getByRole("button", { name: "Voltar à edição", exact: true })
        .last()
        .click();
      if ((await field.inputValue()) !== "Nota sintética " + stage)
        throw Error("NOTA_PERDIDA_NO_RETORNO");
      cases.push({ stage, modalFits: true, returnPreserved: true });
    }
    await page
      .getByRole("button", { name: "Abrir editor real", exact: true })
      .click();
    await page.getByLabel("Título do estudo", { exact: true }).waitFor();
    const editorCases = [];
    for (const [stage, desc] of [
      ["Leia", "Leitura para o aluno"],
      ["Entenda", "Explicação principal"],
      ["Responda", "Perguntas e gabarito"],
      ["Aplique", "Prática da semana"],
    ]) {
      const menu = page.getByRole("button", { name: /Ver etapas/ });
      if (await menu.isVisible()) await menu.click();
      await page
        .getByRole("button", { name: new RegExp(stage + ".*" + desc) })
        .click();
      const field = page.getByLabel(
        stage === "Leia"
          ? "Leitura do aluno"
          : stage === "Entenda"
            ? "Explicação para o aluno"
            : stage === "Responda"
              ? "Orientação antes das perguntas"
              : "Aplicação prática",
        { exact: true }
      );
      const prompt = page.locator("#foundation-editor-part-reflection-prompt");
      await field.fill("Rascunho local " + stage);
      await prompt.fill("Reflexão local " + stage);
      if (stage === "Leia") {
        if (await page.locator("details").evaluate(el => el.open))
          throw Error("PERSONALIZACAO_NAO_RECOLHIDA");
        await page.screenshot({
          path: path.join(out, `leia-${width}.png`),
          animations: "disabled",
          fullPage: false,
        });
      }
      if (stage === "Entenda") {
        await page.screenshot({
          path: path.join(out, `entenda-editor-${width}.png`),
          animations: "disabled",
          fullPage: false,
        });
      }
      if (stage === "Responda") {
        await page
          .getByRole("button", { name: "Adicionar pergunta", exact: true })
          .click();
        await page
          .getByLabel("Pergunta", { exact: true })
          .fill("Qual atitude encoraja uma pessoa?");
        await page
          .getByLabel("Alternativa A", { exact: true })
          .fill("Ouvir com atenção");
        await page.getByLabel("Alternativa B", { exact: true }).fill("Ignorar");
        await page
          .getByRole("button", { name: "Adicionar alternativa", exact: true })
          .click();
        await page
          .getByLabel("Alternativa C", { exact: true })
          .fill("Interromper sempre");
        await page
          .getByRole("radio", { name: "Resposta correta: alternativa A" })
          .check();
        await page
          .getByLabel("Explicação depois da resposta", { exact: true })
          .fill(
            "Ouvir ajuda a perceber a necessidade. Retome o exemplo da leitura."
          );
        if (
          !(await page
            .getByRole("button", { name: "Salvar e continuar", exact: true })
            .isDisabled())
        )
          throw Error("PERGUNTA_ABERTA_PERMITE_AVANCAR");
        if ((await page.getByRole("dialog").count()) !== 1)
          throw Error("PERGUNTA_EMPILHA_MODAL");
        await page.screenshot({
          path: path.join(out, `responda-editor-${width}.png`),
          animations: "disabled",
          fullPage: false,
        });
        if (width < 1024) {
          await page
            .getByRole("button", { name: "Visualizar como aluno", exact: true })
            .click();
          await page
            .getByRole("dialog")
            .last()
            .getByRole("button", { name: "Voltar à edição", exact: true })
            .last()
            .click();
          if (
            (await page
              .getByLabel("Pergunta", { exact: true })
              .inputValue()) !== "Qual atitude encoraja uma pessoa?"
          )
            throw Error("PERGUNTA_PERDIDA_NA_PREVIA");
        }
        await page
          .getByRole("button", { name: "Cancelar", exact: true })
          .click();
        if ((await field.inputValue()) !== "Rascunho local Responda")
          throw Error("ORIENTACAO_PERDIDA_AO_CANCELAR_PERGUNTA");
      }
      if (stage === "Aplique") {
        await page.screenshot({
          path: path.join(out, `aplique-editor-${width}.png`),
          animations: "disabled",
          fullPage: false,
        });
      }
      if (width >= 1024) {
        await page
          .locator("aside")
          .last()
          .getByText("Rascunho local " + stage, { exact: true })
          .waitFor();
        editorCases.push({ stage, liveSidebar: true, returnPreserved: true });
        continue;
      }
      await page
        .getByRole("button", { name: "Visualizar como aluno", exact: true })
        .click();
      const modal = page.getByRole("dialog").last();
      await modal
        .getByText("Rascunho local " + stage, { exact: true })
        .waitFor();
      await modal
        .getByLabel("Minha anotação em " + stage, { exact: true })
        .fill("Nota descartável do professor");
      if (stage === "Entenda") {
        await modal
          .getByText("Reflexão local Entenda", { exact: true })
          .waitFor();
        const order = await modal.evaluate(el => {
          const text = [...el.querySelectorAll("p")];
          const content = text.find(
            p => p.textContent === "Rascunho local Entenda"
          );
          const prompt = text.find(
            p => p.textContent === "Reflexão local Entenda"
          );
          const note = el.querySelector("textarea");
          return Boolean(
            content &&
              prompt &&
              note &&
              content.compareDocumentPosition(prompt) &
                Node.DOCUMENT_POSITION_FOLLOWING &&
              prompt.compareDocumentPosition(note) &
                Node.DOCUMENT_POSITION_FOLLOWING
          );
        });
        if (!order) throw Error("ORDEM_PEDAGOGICA_ENTENDA_INVALIDA");
        await page.screenshot({
          path: path.join(out, `entenda-previa-${width}.png`),
          animations: "disabled",
          fullPage: false,
        });
      }
      const rect = await modal.boundingBox();
      if (rect.width > width + 1) throw Error("OVERFLOW_PREVIA_EDITOR");
      await modal
        .getByRole("button", { name: "Voltar à edição", exact: true })
        .last()
        .click();
      if (
        (await field.inputValue()) !== "Rascunho local " + stage ||
        (await prompt.inputValue()) !== "Reflexão local " + stage
      )
        throw Error("RASCUNHO_PERDIDO");
      editorCases.push({ stage, returnPreserved: true });
    }
    const menu = page.getByRole("button", { name: /Ver etapas/ });
    if (await menu.isVisible()) await menu.click();
    await page
      .getByRole("button", { name: /Revisar e publicar.*Conferência final/ })
      .click();
    await page
      .getByRole("button", { name: "Publicar estudo", exact: true })
      .waitFor();
    const horizontal = await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1
    );
    if (!horizontal) throw Error("OVERFLOW_PAGINA");
    const titleWidth = await page
      .locator("article button")
      .first()
      .evaluate(el => el.getBoundingClientRect().width);
    if (titleWidth < width * 0.35) throw Error("TITULO_COMPRIMIDO");
    await page.screenshot({
      path: path.join(out, `preview-${width}.png`),
      animations: "disabled",
      fullPage: false,
    });
    if (writes || errors.length) throw Error("WRITES_OR_RENDER_ERRORS");
    results.push({
      viewport: [width, height],
      cases,
      editorCases,
      horizontalOverflow: false,
      contextualQuestionForm: true,
      applicationFields: true,
      studentNoteFullWidth: true,
      mutations: 0,
      errors: 0,
    });
    await page.close();
  }
  await fs.writeFile(
    path.join(out, "results.json"),
    JSON.stringify(
      { kind: "isolated-real-components-not-authenticated-e2e", results },
      null,
      2
    ) + "\n"
  );
  console.log(
    JSON.stringify({
      result: "PASS",
      viewports: results.length,
      stageCases: results.reduce((sum, r) => sum + r.cases.length, 0),
      mutations: 0,
      output: out,
    })
  );
} catch (error) {
  for (const page of browser.contexts().flatMap(c => c.pages())) {
    await page.screenshot({
      path: path.join(out, "failure.png"),
      animations: "disabled",
      fullPage: false,
    });
    console.log(
      await page.evaluate(() =>
        [...document.querySelectorAll("button")]
          .filter(b => b.getClientRects().length)
          .map(b => ({
            text: b.textContent.trim(),
            rect: JSON.stringify(b.getBoundingClientRect()),
          }))
          .slice(-25)
      )
    );
  }
  throw error;
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
  await fs.rm(temp, { recursive: true, force: true });
}
