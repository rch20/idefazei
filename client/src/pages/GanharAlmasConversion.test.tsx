// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import React from "react";
import {
  act,
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GanharAlmas from "./GanharAlmas";

const mocks = vi.hoisted(() => ({
  church: {
    churchId: 100,
    accessSummary: {
      isPastoralWorker: true,
    },
  },
  navigate: vi.fn(),
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
  queries: {
    soulsList: vi.fn(),
    publicLeadsList: vi.fn(),
    peopleList: vi.fn(),
    possibleMatches: vi.fn(),
    soulsRefetch: vi.fn(),
    publicLeadsRefetch: vi.fn(),
    peopleRefetch: vi.fn(),
  },
  mutations: {
    updateStatusUseMutation: vi.fn(),
    updateStatusMutate: vi.fn(),
    createSoulUseMutation: vi.fn(),
    createSoulMutate: vi.fn(),
    convertUseMutation: vi.fn(),
    convertMutate: vi.fn(),
    convertOptions: null as any,
    convertIsPending: false,
  },
}));

vi.mock("@/components/ChurchLayout", () => ({
  useChurch: () => mocks.church,
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    souls: {
      list: { useQuery: mocks.queries.soulsList },
      create: { useMutation: mocks.mutations.createSoulUseMutation },
    },
    publicRegistration: {
      list: { useQuery: mocks.queries.publicLeadsList },
      updateStatus: { useMutation: mocks.mutations.updateStatusUseMutation },
      convertToDisciple: { useMutation: mocks.mutations.convertUseMutation },
    },
    people: {
      list: { useQuery: mocks.queries.peopleList },
      findPossibleMatches: { useQuery: mocks.queries.possibleMatches },
    },
  },
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/app/almas", mocks.navigate],
}));

vi.mock("sonner", () => ({
  toast: mocks.toast,
}));

vi.mock("@/lib/civilDate", () => ({
  currentCivilDateKey: () => "2026-09-20",
}));

vi.mock("@/lib/discipleshipState", () => ({
  deriveDiscipleshipDisplayState: ({
    personId,
    discipleshipStage,
  }: {
    personId: number | null;
    discipleshipStage?: string | null;
  }) => ({
    kind: personId ? "disciple" : "pending",
    stage: discipleshipStage ?? "nova_alma",
    label: personId ? "Discípulo" : "Cadastro pendente",
  }),
  getDiscipleshipStageLabel: (stage: string) => stage,
}));

type PublicLead = {
  id: number;
  name: string;
  whatsapp: string;
  personId: number | null;
  status: "novo" | "em_atendimento" | "convertido" | "encerrado";
  source: "qrcode" | "convite" | "evento" | "link";
  campaign: string | null;
  createdAt: string;
  city: string | null;
  state: string | null;
  email: string | null;
  discipleshipStage: string | null;
};

type MutationOptions = {
  onSuccess?: (result: any) => unknown;
  onError?: (error: Error) => unknown;
};

const pendingLead: PublicLead = {
  id: 9,
  name: "Maria da Silva",
  whatsapp: "(11) 99999-8888",
  personId: null,
  status: "novo",
  source: "evento",
  campaign: "Culto de domingo",
  createdAt: "2026-09-20T12:00:00.000Z",
  city: "São Paulo",
  state: "SP",
  email: "maria@example.com",
  discipleshipStage: null,
};

const linkedLead: PublicLead = {
  ...pendingLead,
  personId: 501,
  status: "convertido",
  discipleshipStage: "nova_alma",
};

function queryResult<T>(
  data: T,
  refetch = vi.fn().mockResolvedValue(undefined)
) {
  return {
    data,
    isLoading: false,
    isError: false,
    isSuccess: true,
    refetch,
  };
}

function configureMocks(leads: PublicLead[] = [pendingLead]) {
  const successfulRefetch = {
    isError: false,
    isSuccess: true,
  };

  mocks.queries.soulsRefetch.mockResolvedValue(successfulRefetch);
  mocks.queries.publicLeadsRefetch.mockResolvedValue(successfulRefetch);
  mocks.queries.peopleRefetch.mockResolvedValue(successfulRefetch);

  mocks.queries.soulsList.mockReturnValue(
    queryResult([] as any[], mocks.queries.soulsRefetch)
  );
  mocks.queries.publicLeadsList.mockReturnValue(
    queryResult(leads, mocks.queries.publicLeadsRefetch)
  );
  mocks.queries.peopleList.mockReturnValue(
    queryResult([] as any[], mocks.queries.peopleRefetch)
  );
  mocks.queries.possibleMatches.mockReturnValue(queryResult([] as any[]));

  mocks.mutations.updateStatusUseMutation.mockImplementation(() => ({
    mutate: mocks.mutations.updateStatusMutate,
    isPending: false,
  }));
  mocks.mutations.createSoulUseMutation.mockImplementation(() => ({
    mutate: mocks.mutations.createSoulMutate,
    isPending: false,
  }));
  mocks.mutations.convertUseMutation.mockImplementation(
    (options: MutationOptions) => {
      mocks.mutations.convertOptions = options;
      return {
        mutate: mocks.mutations.convertMutate,
        isPending: mocks.mutations.convertIsPending,
      };
    }
  );
}

function renderPage(leads: PublicLead[] = [pendingLead]) {
  configureMocks(leads);
  return render(<GanharAlmas />);
}

async function openConversionDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole("button", {
      name: "Converter em Discípulo",
    })
  );

  return screen.findByRole("alertdialog");
}

function getLeadCard(name: string) {
  const nameElement = screen.getByText(name, { selector: "p" });
  const card = nameElement.closest("article");
  expect(card).not.toBeNull();
  return card as HTMLElement;
}

async function confirmConversion(user: ReturnType<typeof userEvent.setup>) {
  const dialog = await screen.findByRole("alertdialog");
  await user.click(
    within(dialog).getByRole("button", {
      name: "Converter em Discípulo",
    })
  );
}

async function resolveConversion(result: any) {
  expect(mocks.mutations.convertOptions?.onSuccess).toBeTypeOf("function");
  await act(async () => {
    await mocks.mutations.convertOptions.onSuccess(result);
  });
}

async function rejectConversion(
  message = "Não foi possível converter o cadastro."
) {
  expect(mocks.mutations.convertOptions?.onError).toBeTypeOf("function");
  await act(async () => {
    await mocks.mutations.convertOptions.onError(new Error(message));
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.mutations.convertOptions = null;
  mocks.mutations.convertIsPending = false;
  mocks.church.churchId = 100;
  mocks.church.accessSummary = { isPastoralWorker: true };
  configureMocks();
});

afterEach(() => {
  cleanup();
});

describe("GanharAlmas — conversão de cadastro público em Discípulo", () => {
  it("exibe a ação para um Lead pendente sem abrir confirmação inicialmente", () => {
    renderPage();

    expect(
      screen.getByRole("button", { name: "Converter em Discípulo" })
    ).toBeEnabled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(mocks.mutations.convertMutate).not.toHaveBeenCalled();
  });

  it("não usa window.confirm e abre um diálogo acessível sem chamar a mutation", async () => {
    const user = userEvent.setup();
    const browserConfirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    renderPage();

    const dialog = await openConversionDialog(user);

    expect(dialog).toHaveAccessibleName("Converter em Discípulo?");
    expect(dialog).toHaveTextContent("Maria da Silva");
    expect(dialog).toHaveTextContent(/verificará o WhatsApp/i);
    expect(dialog).toHaveTextContent(/uma única ficha ativa/i);
    expect(dialog).toHaveTextContent(/mais de uma/i);
    expect(dialog).toHaveTextContent(/criará uma nova ficha/i);
    expect(
      within(dialog).getByRole("button", { name: "Continuar como cadastro" })
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Converter em Discípulo" })
    ).toBeInTheDocument();
    expect(mocks.mutations.convertMutate).not.toHaveBeenCalled();
    expect(browserConfirm).not.toHaveBeenCalled();

    browserConfirm.mockRestore();
  });

  it("cancela pelo botão sem chamar a mutation ou refazer consultas", async () => {
    const user = userEvent.setup();
    renderPage();

    const dialog = await openConversionDialog(user);
    await user.click(
      within(dialog).getByRole("button", {
        name: "Continuar como cadastro",
      })
    );

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(mocks.mutations.convertMutate).not.toHaveBeenCalled();
    expect(mocks.queries.publicLeadsRefetch).not.toHaveBeenCalled();
    expect(mocks.queries.soulsRefetch).not.toHaveBeenCalled();
    expect(mocks.queries.peopleRefetch).not.toHaveBeenCalled();
  });

  it("cancela com Escape sem chamar a mutation", async () => {
    const user = userEvent.setup();
    renderPage();

    await openConversionDialog(user);
    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    });
    expect(mocks.mutations.convertMutate).not.toHaveBeenCalled();
  });

  it("confirma uma única vez com o churchId e o id do Lead congelados", async () => {
    const user = userEvent.setup();
    renderPage();

    await openConversionDialog(user);
    await confirmConversion(user);

    expect(mocks.mutations.convertMutate).toHaveBeenCalledTimes(1);
    expect(mocks.mutations.convertMutate).toHaveBeenCalledWith({
      churchId: 100,
      id: 9,
    });
  });

  it("mantém o Lead correto quando a lista é rerenderizada enquanto a confirmação está aberta", async () => {
    const user = userEvent.setup();
    const view = renderPage([
      pendingLead,
      { ...pendingLead, id: 10, name: "João Souza" },
    ]);

    await user.click(
      within(getLeadCard("Maria da Silva")).getByRole("button", {
        name: "Converter em Discípulo",
      })
    );

    mocks.queries.publicLeadsList.mockReturnValue(
      queryResult([
        { ...pendingLead, name: "Maria atualizada" },
        { ...pendingLead, id: 10, name: "João Souza" },
      ])
    );
    view.rerender(<GanharAlmas />);

    await confirmConversion(user);

    expect(mocks.mutations.convertMutate).toHaveBeenCalledWith({
      churchId: 100,
      id: 9,
    });
  });

  it("desabilita o diálogo e a ação da lista durante pending", async () => {
    const user = userEvent.setup();
    const view = renderPage();

    await openConversionDialog(user);
    mocks.mutations.convertIsPending = true;
    view.rerender(<GanharAlmas />);

    const dialog = await screen.findByRole("alertdialog");
    expect(
      within(dialog).getByRole("button", { name: "Convertendo…" })
    ).toBeDisabled();
    expect(
      within(dialog).getByRole("button", { name: "Continuar como cadastro" })
    ).toBeDisabled();
    const leadActionButton =
      getLeadCard("Maria da Silva").querySelector("button");
    expect(leadActionButton).not.toBeNull();
    expect(leadActionButton).toBeDisabled();

    await user.click(
      within(dialog).getByRole("button", { name: "Convertendo…" })
    );
    expect(mocks.mutations.convertMutate).not.toHaveBeenCalled();
  });

  it("não permite chamadas duplicadas por cliques repetidos", async () => {
    const user = userEvent.setup();
    renderPage();

    await openConversionDialog(user);
    const dialog = await screen.findByRole("alertdialog");
    const confirmButton = within(dialog).getByRole("button", {
      name: "Converter em Discípulo",
    });

    await user.click(confirmButton);
    await user.click(confirmButton);
    await user.click(confirmButton);

    expect(mocks.mutations.convertMutate).toHaveBeenCalledTimes(1);
  });

  it.each([
    {
      status: "created",
      result: {
        status: "created",
        person: { id: 501, fullName: "Maria da Silva" },
      },
      toast: "Discípulo convertido. A ficha foi criada em Pessoas.",
      toastMethod: "success" as const,
    },
    {
      status: "linked",
      result: {
        status: "linked",
        person: { id: 501, fullName: "Maria da Silva" },
      },
      toast: "Cadastro convertido e vinculado à ficha existente em Discípulos.",
      toastMethod: "success" as const,
    },
    {
      status: "already_converted",
      result: {
        status: "already_converted",
        person: { id: 501, fullName: "Maria da Silva" },
      },
      toast: "Este cadastro já estava vinculado a uma ficha de Discípulo.",
      toastMethod: "success" as const,
    },
    {
      status: "ambiguous",
      result: {
        status: "ambiguous",
        matches: [
          { id: 501, fullName: "Maria da Silva" },
          { id: 502, fullName: "Maria Souza" },
        ],
      },
      toast:
        "Encontramos 2 fichas com este WhatsApp. Revise a aba Pessoas antes de vincular.",
      toastMethod: "error" as const,
    },
  ])(
    "preserva o feedback do procedure para o estado $status e atualiza as consultas após sucesso",
    async ({ result, toast, toastMethod }) => {
      const user = userEvent.setup();
      renderPage();

      await openConversionDialog(user);
      await confirmConversion(user);
      await resolveConversion(result);

      expect(mocks.queries.publicLeadsRefetch).toHaveBeenCalledTimes(1);
      expect(mocks.queries.soulsRefetch).toHaveBeenCalledTimes(1);
      expect(mocks.queries.peopleRefetch).toHaveBeenCalledTimes(1);
      expect(mocks.toast[toastMethod]).toHaveBeenCalledWith(toast);
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
      expect(mocks.navigate).not.toHaveBeenCalled();
    }
  );

  it("informa que a conversão foi concluída quando um refetch resolve com isError true", async () => {
    const user = userEvent.setup();
    renderPage();

    mocks.queries.peopleRefetch.mockResolvedValueOnce({
      isError: true,
      isSuccess: false,
    });

    await openConversionDialog(user);
    await confirmConversion(user);

    await resolveConversion({
      status: "created",
      person: {
        id: 501,
        fullName: "Maria da Silva",
      },
    });

    expect(mocks.queries.publicLeadsRefetch).toHaveBeenCalledTimes(1);
    expect(mocks.queries.soulsRefetch).toHaveBeenCalledTimes(1);
    expect(mocks.queries.peopleRefetch).toHaveBeenCalledTimes(1);
    expect(mocks.toast.success).toHaveBeenCalledWith(
      "Discípulo convertido. A ficha foi criada em Pessoas."
    );
    expect(mocks.toast.warning).toHaveBeenCalledWith(
      "A operação foi concluída, mas não foi possível atualizar todas as listas. Recarregue a página para conferir o estado atualizado."
    );
    expect(mocks.toast.error).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("mantém a confirmação recuperável após erro e não cria sucesso falso", async () => {
    const user = userEvent.setup();
    renderPage();

    await openConversionDialog(user);
    await confirmConversion(user);
    await rejectConversion();

    expect(mocks.toast.error).toHaveBeenCalledWith(
      "Não foi possível converter o cadastro."
    );
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Converter em Discípulo",
      })
    ).toBeEnabled();
    expect(mocks.toast.success).not.toHaveBeenCalled();
    expect(mocks.queries.publicLeadsRefetch).not.toHaveBeenCalled();
  });

  it("permite nova tentativa somente após erro explícito, sem retry automático", async () => {
    const user = userEvent.setup();
    renderPage();

    await openConversionDialog(user);
    await confirmConversion(user);
    await rejectConversion();

    await confirmConversion(user);

    expect(mocks.mutations.convertMutate).toHaveBeenCalledTimes(2);
  });

  it("mantém o Lead já vinculado como ação de abrir ficha, sem nova conversão", async () => {
    const user = userEvent.setup();
    renderPage([linkedLead]);

    expect(
      screen.queryByRole("button", { name: "Converter em Discípulo" })
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: "Abrir ficha em Discípulos" })
    );

    expect(mocks.navigate).toHaveBeenCalledWith(
      "/app/pessoas?personId=501&section=jornada"
    );
    expect(mocks.mutations.convertMutate).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("não confirma nem chama o backend quando não existe igreja ativa", async () => {
    const user = userEvent.setup();
    mocks.church.churchId = null as any;
    renderPage();

    await user.click(
      screen.getByRole("button", { name: "Converter em Discípulo" })
    );
    const dialog = await screen.findByRole("alertdialog");
    await user.click(
      within(dialog).getByRole("button", { name: "Converter em Discípulo" })
    );

    expect(mocks.mutations.convertMutate).not.toHaveBeenCalled();
  });
});
