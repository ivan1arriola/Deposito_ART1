import {
  DELETE as deleteItem,
  GET as getItem,
  PATCH as patchItem,
  POST as postItem,
  PUT as putItem,
} from "@/app/api/items/[itemId]/route";

type EquipoRouteContext = {
  params: Promise<{ equipoId: string }>;
};

function toItemRouteContext(context: EquipoRouteContext) {
  return {
    params: context.params.then(({ equipoId }) => ({ itemId: equipoId })),
  };
}

export async function GET(request: Request, context: EquipoRouteContext) {
  return getItem(request, toItemRouteContext(context));
}

export async function POST(request: Request, context: EquipoRouteContext) {
  return postItem(request, toItemRouteContext(context));
}

export async function PUT(request: Request, context: EquipoRouteContext) {
  return putItem(request, toItemRouteContext(context));
}

export async function PATCH(request: Request, context: EquipoRouteContext) {
  return patchItem(request, toItemRouteContext(context));
}

export async function DELETE(request: Request, context: EquipoRouteContext) {
  return deleteItem(request, toItemRouteContext(context));
}
