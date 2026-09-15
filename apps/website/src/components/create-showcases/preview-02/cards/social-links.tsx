import { Camera, CirclePlus, Cloud, Globe } from "lucide-solid";
import { Button } from "@/registry/kobalte/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/registry/kobalte/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/registry/kobalte/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/registry/kobalte/ui/input-group";

export function SocialLinks() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Social Links</CardTitle>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel for="spotify-url">Spotify Artist URL</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <CirclePlus />
              </InputGroupAddon>
              <InputGroupInput id="spotify-url" defaultValue="spotify.com/artist/3j...2k" />
            </InputGroup>
          </Field>
          <Field>
            <FieldLabel for="instagram-handle">Instagram Handle</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <Camera />
              </InputGroupAddon>
              <InputGroupInput id="instagram-handle" defaultValue="@julianduryea_music" />
            </InputGroup>
          </Field>
          <Field>
            <FieldLabel for="soundcloud-url">SoundCloud URL</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <Cloud />
              </InputGroupAddon>
              <InputGroupInput id="soundcloud-url" placeholder="soundcloud.com/username" />
            </InputGroup>
          </Field>
          <Field>
            <FieldLabel for="website-url">Website</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <Globe />
              </InputGroupAddon>
              <InputGroupInput id="website-url" placeholder="https://yoursite.com" />
            </InputGroup>
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter class="justify-end gap-2 style-sera:justify-center">
        <Button variant="secondary" class="style-sera:flex-1">
          Discard
        </Button>
        <Button class="style-sera:flex-1">Save Changes</Button>
      </CardFooter>
    </Card>
  );
}
